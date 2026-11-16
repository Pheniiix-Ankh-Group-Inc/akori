-- =============================================================================
-- BIB — Application de la migration 0012 (bib_finalisation)
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj) — à coller dans l'éditeur
-- SQL du tableau de bord. Transaction unique : en cas d'erreur, rien n'est
-- appliqué. Généré par supabase/ops/akori/build_0012.py (ne pas modifier à la main).
--
-- Effets : bucket bib-sob-snapshots privé, fin de la lecture anonyme des tables
-- de données State of BIB, empreinte de la source, journal de réconciliation,
-- thèmes d'actualité, verrou atomique des synchronisations Luma.
-- Aucune donnée n'est supprimée.
-- =============================================================================
begin;

do $$
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261115001100') then
    raise exception 'Migration 0011 absente : appliquer d''abord les migrations précédentes.';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261116001200') then
    raise exception 'Migration 0012 déjà enregistrée : rien à faire.';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'kori%') then
    raise exception 'Objets KoriVenture présents : ce script ne s''applique qu''à la base BIB nettoyée.';
  end if;
  if (select count(*) from public.event_sync_runs where status = 'running') > 1 then
    raise exception 'Plusieurs synchronisations « running » : clore les exécutions interrompues avant d''appliquer le verrou.';
  end if;
end $$;

-- =============================================================================
-- BIB 0012 — Finalisation State of BIB / Luma (additive, idempotente)
--
--  1. State of BIB : empreinte et version brute du fournisseur (détection d'une
--     correction publiée sous le même numéro de version) ; journal des
--     réconciliations PostgreSQL / Storage / dépôt.
--  2. State of BIB : le bucket bib-sob-snapshots devient PRIVÉ et la lecture
--     anonyme des tables de données est retirée — plus aucun artefact ou jeu
--     de données complet n'est distribué par une URL ou une API publique. Le
--     site lit les données côté serveur (clé de service).
--  3. Newsletter : thèmes d'actualité supplémentaires (paiements,
--     infrastructure, initiatives communautaires).
--  4. Luma : verrou atomique des synchronisations (index unique partiel +
--     RPC begin_event_sync_run), reprise des exécutions interrompues.
--
-- Aucune donnée BIB n'est supprimée. Aucun objet hors BIB n'est créé.
-- Reprise : chaque instruction est rejouable ; pour revenir en arrière,
-- voir docs/V2_ARCHITECTURE_CIBLE.md § Migration 0012.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. State of BIB — provenance fine et réconciliation
-- ---------------------------------------------------------------------------
alter table public.dataset_versions
  add column if not exists source_version text check (source_version is null or char_length(source_version) <= 64),
  add column if not exists source_fingerprint text check (source_fingerprint is null or source_fingerprint ~ '^[0-9a-f]{64}$');

comment on column public.dataset_versions.source_version is
  'Version annoncée par le fournisseur (manifeste). provider_version peut porter un suffixe -rN pour une correction.';
comment on column public.dataset_versions.source_fingerprint is
  'SHA-256 du manifeste réduit aux ressources utilisées (chemin, taille, empreinte) : détecte une correction sans changement de version.';

create index if not exists dataset_versions_fingerprint_idx
  on public.dataset_versions (source_id, source_fingerprint);

alter table public.ingestion_runs drop constraint if exists ingestion_runs_kind_check;
alter table public.ingestion_runs
  add constraint ingestion_runs_kind_check
  check (kind in ('version_check', 'build', 'publish', 'reconcile'));

-- ---------------------------------------------------------------------------
-- 2. State of BIB — plus de bucket public
-- ---------------------------------------------------------------------------
update storage.buckets set public = false where id = 'bib-sob-snapshots' and public;

-- Plus d'accès public direct (API REST anonyme) aux données complètes : le
-- site lit ces tables côté serveur avec la clé de service et n'affiche que les
-- visualisations. L'équipe éditoriale garde la lecture (administration).
drop policy if exists dataset_versions_public_read on public.dataset_versions;
drop policy if exists dataset_artifacts_public_read on public.dataset_artifacts;
drop policy if exists metric_observations_public_read on public.metric_observations;
drop policy if exists data_sources_public_read on public.data_sources;
drop policy if exists sob_insights_public_read on public.sob_insights;

drop policy if exists metric_observations_editor_read on public.metric_observations;
create policy metric_observations_editor_read on public.metric_observations
  for select to authenticated using ((select private.is_editor()));
drop policy if exists data_sources_editor_read on public.data_sources;
create policy data_sources_editor_read on public.data_sources
  for select to authenticated using ((select private.is_editor()));

revoke select on public.dataset_versions, public.dataset_artifacts, public.metric_observations,
  public.data_sources, public.sob_insights from anon;

-- ---------------------------------------------------------------------------
-- 3. Newsletter — thèmes d'actualité supplémentaires
-- ---------------------------------------------------------------------------
alter type public.newsletter_theme add value if not exists 'payments';
alter type public.newsletter_theme add value if not exists 'infrastructure';
alter type public.newsletter_theme add value if not exists 'community';

-- ---------------------------------------------------------------------------
-- 4. Luma — verrou atomique des synchronisations
-- ---------------------------------------------------------------------------
-- Une seule exécution « running » à la fois, garantie par la base.
create unique index if not exists event_sync_runs_single_running_idx
  on public.event_sync_runs ((true)) where status = 'running';

-- Ouvre une exécution : clôt d'abord les exécutions interrompues (plus
-- anciennes que p_stale_minutes), puis insère. Renvoie l'identifiant, ou NULL
-- si une exécution est déjà en cours (aucune erreur : le verrou a joué).
create or replace function public.begin_event_sync_run(
  p_trigger text,
  p_requested_by uuid default null,
  p_stale_minutes integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_service() then
    raise exception 'service role required' using errcode = 'BIB01';
  end if;
  if p_trigger not in ('schedule', 'manual', 'upload') then
    raise exception 'invalid trigger' using errcode = 'BIB02';
  end if;

  update public.event_sync_runs
     set status = 'failed', finished_at = now(),
         error = 'exécution interrompue (délai dépassé)'
   where status = 'running'
     and started_at < now() - make_interval(mins => greatest(coalesce(p_stale_minutes, 30), 1));

  begin
    insert into public.event_sync_runs (trigger, requested_by, status)
    values (p_trigger, p_requested_by, 'running')
    returning id into v_id;
  exception when unique_violation then
    return null;
  end;
  return v_id;
end;
$$;

revoke all on function public.begin_event_sync_run(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.begin_event_sync_run(text, uuid, integer) to service_role;


insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261116001200', 'bib_finalisation', array[]::text[]) on conflict (version) do nothing;

-- Vérifications finales (échec = annulation complète).
do $$
begin
  if exists (select 1 from storage.buckets where id like 'bib-sob-%' and public) then
    raise exception 'Un bucket State of BIB est encore public.';
  end if;
  if has_table_privilege('anon', 'public.dataset_versions', 'select')
     or has_table_privilege('anon', 'public.metric_observations', 'select')
     or has_table_privilege('anon', 'public.dataset_artifacts', 'select') then
    raise exception 'Lecture anonyme des données State of BIB encore possible.';
  end if;
  if to_regprocedure('public.begin_event_sync_run(text, uuid, integer)') is null then
    raise exception 'Fonction begin_event_sync_run absente.';
  end if;
  if (select count(*) from pg_tables where schemaname = 'public') <> 28 then
    raise exception 'Nombre de tables publiques inattendu (28 attendues).';
  end if;
end $$;

commit;

-- Après application : lancer les conseillers Supabase (sécurité, performance).
