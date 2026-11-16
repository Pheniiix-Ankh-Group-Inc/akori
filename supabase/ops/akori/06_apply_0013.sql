-- =============================================================================
-- BIB — Application de la migration 0013 (sob_full_auto)
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj) — à coller dans l'éditeur
-- SQL du tableau de bord. Transaction unique : en cas d'erreur, rien n'est
-- appliqué. Généré par supabase/ops/akori/build_0013.py (ne pas modifier à la main).
--
-- Effets : modes « sob » et « sob_insights » passés à AUTO (publication sans
-- approbation humaine), publication sûre en cas d'exécutions simultanées,
-- vérification après publication, suivi des tentatives. Aucune donnée supprimée.
-- Le mode « newsletter » n'est pas modifié.
-- =============================================================================
begin;

do $$
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261116001200') then
    raise exception 'Migration 0012 absente : appliquer d''abord les migrations précédentes.';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261117001300') then
    raise exception 'Migration 0013 déjà enregistrée : rien à faire.';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'kori%') then
    raise exception 'Objets KoriVenture présents : ce script ne s''applique qu''à la base BIB.';
  end if;
end $$;

-- =============================================================================
-- BIB 0013 — State of BIB entièrement automatique (additive, rejouable)
--
-- Décision produit : pour le MVP, la publication des données State of BIB et de
-- leurs analyses ne dépend d'aucune approbation humaine.
--
--  1. Modes « sob » et « sob_insights » : auto (les modes review et paused
--     restent disponibles pour une évolution future ; newsletter inchangé).
--  2. Publication : verrou consultatif par source — deux exécutions simultanées
--     ne peuvent pas publier des versions concurrentes ; garde-fou contre la
--     publication automatique d'une version plus ancienne que la version
--     courante ; contrôle des observations.
--  3. verify_current_dataset : vérification après publication (pointeur unique,
--     artefacts, observations), utilisable par le pipeline et l'administration.
--  4. Suivi des tentatives et de la quarantaine d'une version bloquée.
--
-- Aucune donnée n'est supprimée. Aucun compte administrateur n'est requis :
-- le pipeline agit avec le rôle de service.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Modes par défaut du MVP
-- ---------------------------------------------------------------------------
update public.automation_settings set mode = 'auto', updated_at = now()
 where module in ('sob', 'sob_insights') and mode <> 'auto';
insert into public.automation_settings (module, mode) values ('sob', 'auto'), ('sob_insights', 'auto')
on conflict (module) do nothing;

insert into public.editorial_audit (actor_id, action, entity_type, details)
select null, 'automation.mode_change', 'automation', jsonb_build_object('modules', 'sob,sob_insights', 'mode', 'auto', 'by', 'migration 0013')
 where not exists (select 1 from public.editorial_audit where action = 'automation.mode_change' and details ->> 'by' = 'migration 0013');

-- ---------------------------------------------------------------------------
-- 2. Suivi des tentatives (quarantaine et reprise automatique bornée)
-- ---------------------------------------------------------------------------
alter table public.dataset_versions
  add column if not exists attempts integer not null default 0 check (attempts >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists quarantine_reason text check (quarantine_reason is null or char_length(quarantine_reason) <= 1000);

comment on column public.dataset_versions.attempts is
  'Nombre de traitements de cette version (reprise automatique bornée d''une version bloquée).';
comment on column public.dataset_versions.quarantine_reason is
  'Motif du blocage automatique (contrôles renforcés non concluants) ; NULL si la version n''est pas en quarantaine.';

-- ---------------------------------------------------------------------------
-- 3. Publication atomique, sûre en cas d'exécutions simultanées
-- ---------------------------------------------------------------------------
create or replace function public.publish_dataset_candidate(p_version_id uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.dataset_versions%rowtype;
  v_cur public.dataset_versions%rowtype;
  v_mode text := private.automation_mode('sob');
  v_admin boolean := private.is_admin();
  v_service boolean := private.is_service();
  v_artifacts int;
  v_observations int;
begin
  if not v_admin and not v_service then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_mode = 'paused' then
    raise exception 'publication paused' using errcode = 'BIB09';
  end if;
  if v_service and not v_admin and v_mode <> 'auto' then
    raise exception 'automatic publication requires mode auto (current: %)', v_mode using errcode = 'BIB09';
  end if;

  select * into v_row from public.dataset_versions where id = p_version_id;
  if v_row.id is null then
    raise exception 'dataset version not found' using errcode = 'BIB02';
  end if;
  -- Une seule publication à la fois par source : la seconde exécution attend
  -- la fin de la première, puis relit l'état réel.
  perform pg_advisory_xact_lock(hashtextextended('bib.sob.publish.' || v_row.source_id, 0));
  select * into v_row from public.dataset_versions where id = p_version_id for update;

  if v_row.status::text = 'published' and v_row.is_current then
    return 'noop';
  end if;
  if v_row.status::text <> 'validated' then
    raise exception 'only a validated candidate can be published (status=%)', v_row.status using errcode = 'BIB04';
  end if;
  if coalesce(v_row.validation_report ->> 'passed', 'false') <> 'true' then
    raise exception 'validation report missing or failed' using errcode = 'BIB06';
  end if;
  select count(*) into v_artifacts from public.dataset_artifacts where dataset_version_id = p_version_id;
  if v_artifacts < 6 then
    raise exception 'incomplete artifact set (%)', v_artifacts using errcode = 'BIB06';
  end if;
  select count(*) into v_observations from public.metric_observations where dataset_version_id = p_version_id;
  if v_observations < 1 then
    raise exception 'no observation recorded for this version' using errcode = 'BIB06';
  end if;

  -- Le pipeline ne remplace jamais automatiquement la version courante par des
  -- données plus anciennes (exécutions désordonnées). Un admin peut le faire,
  -- ou utiliser restore_dataset_version.
  select * into v_cur from public.dataset_versions where source_id = v_row.source_id and is_current;
  if v_cur.id is not null and v_service and not v_admin and v_row.as_of_date < v_cur.as_of_date then
    raise exception 'candidate (%) is older than the current version (%)', v_row.as_of_date, v_cur.as_of_date using errcode = 'BIB04';
  end if;

  update public.dataset_versions set is_current = false, status = 'superseded'
   where source_id = v_row.source_id and is_current;
  update public.dataset_versions
     set is_current = true, status = 'published', published_at = now(),
         decided_by = auth.uid(), decided_at = now(), decision_note = p_note, quarantine_reason = null
   where id = p_version_id;
  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'dataset_version.publish', 'dataset_version', p_version_id,
          jsonb_build_object('mode', v_mode, 'by', case when v_admin then 'admin' else 'pipeline' end,
                             'version', v_row.provider_version,
                             'replaces', v_cur.provider_version));
  return 'published';
end $$;

revoke all on function public.publish_dataset_candidate(uuid, text) from public, anon;
grant execute on function public.publish_dataset_candidate(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Vérification après publication
-- ---------------------------------------------------------------------------
create or replace function public.verify_current_dataset(p_source_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cur public.dataset_versions%rowtype;
  v_currents int;
  v_artifacts int;
  v_observations int;
  v_problems text[] := '{}';
begin
  if not private.is_service() and not private.is_editor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select count(*) into v_currents from public.dataset_versions where source_id = p_source_id and is_current;
  if v_currents = 0 then
    return jsonb_build_object('ok', false, 'version', null, 'problems', jsonb_build_array('aucune version courante'));
  end if;
  if v_currents > 1 then
    v_problems := v_problems || 'plusieurs versions courantes';
  end if;
  select * into v_cur from public.dataset_versions where source_id = p_source_id and is_current limit 1;
  if v_cur.status::text <> 'published' then
    v_problems := v_problems || format('version courante au statut %s', v_cur.status);
  end if;
  if coalesce(v_cur.validation_report ->> 'passed', 'false') <> 'true' then
    v_problems := v_problems || 'rapport de validation absent ou en échec';
  end if;
  select count(*) into v_artifacts from public.dataset_artifacts
   where dataset_version_id = v_cur.id and sha256 ~ '^[0-9a-f]{64}$';
  if v_artifacts < 6 then
    v_problems := v_problems || format('%s artefact(s) avec empreinte au lieu de 6', v_artifacts);
  end if;
  select count(*) into v_observations from public.metric_observations where dataset_version_id = v_cur.id;
  if v_observations < 1 then
    v_problems := v_problems || 'aucune observation';
  end if;
  return jsonb_build_object(
    'ok', coalesce(array_length(v_problems, 1), 0) = 0,
    'version', v_cur.provider_version,
    'version_id', v_cur.id,
    'as_of_date', v_cur.as_of_date,
    'published_at', v_cur.published_at,
    'artifacts', v_artifacts,
    'observations', v_observations,
    'problems', to_jsonb(v_problems));
end $$;

revoke all on function public.verify_current_dataset(text) from public, anon;
grant execute on function public.verify_current_dataset(text) to authenticated, service_role;


insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261117001300', 'sob_full_auto', array[]::text[]) on conflict (version) do nothing;

-- Vérifications finales (échec = annulation complète).
do $$
begin
  if (select count(*) from public.automation_settings where module in ('sob', 'sob_insights') and mode = 'auto') <> 2 then
    raise exception 'Les modes sob et sob_insights ne sont pas « auto ».';
  end if;
  if to_regprocedure('public.verify_current_dataset(text)') is null then
    raise exception 'Fonction verify_current_dataset absente.';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'dataset_versions' and column_name = 'attempts') then
    raise exception 'Colonne dataset_versions.attempts absente.';
  end if;
  if (select count(*) from pg_tables where schemaname = 'public') <> 28 then
    raise exception 'Nombre de tables publiques inattendu (28 attendues).';
  end if;
end $$;

commit;

-- Contrôle après application :
--   select module, mode from public.automation_settings order by module;
