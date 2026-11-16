-- =============================================================================
-- BIB — Migration corrective 0007 : gouvernance de publication State of BIB
-- -----------------------------------------------------------------------------
-- Additive. Sépare strictement :
--   A/B. détection + préparation (pipeline) → version « validated » =
--        CANDIDATE, fichiers dans le bucket PRIVÉ bib-sob-candidates ;
--   C.   revue humaine de la pull request des JSON ;
--   D.   promotion APRÈS fusion : promote_dataset_version() vérifie que les
--        empreintes SHA-256 des fichiers du commit approuvé sont exactement
--        celles de la candidate, puis déplace atomiquement le pointeur courant ;
--   E.   repli : rollback_dataset_version() réactive une version déjà publiée.
-- publish_dataset_version() (0004) n'est plus exécutable par le service :
-- seule la promotion vérifiée peut publier.
-- Le nombre de tables reste inchangé (26).
-- =============================================================================

alter table public.dataset_versions
  add column if not exists approved_commit_sha text
    check (approved_commit_sha is null or approved_commit_sha ~ '^[0-9a-f]{40}$'),
  add column if not exists candidate_at timestamptz;

-- Bucket privé des candidates (jamais lisible publiquement).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bib-sob-candidates', 'bib-sob-candidates', false, 52428800, array['application/json'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Promotion vérifiée (service uniquement)
-- p_artifacts : [{ "name": "meta.json", "sha256": "…" }, …] calculé sur les
-- fichiers du commit approuvé. Doit correspondre EXACTEMENT (mêmes noms, mêmes
-- empreintes) aux artefacts enregistrés pour la candidate.
-- Idempotent : une version déjà courante avec le même commit renvoie 'noop'.
-- ---------------------------------------------------------------------------
create or replace function public.promote_dataset_version(
  p_version_id uuid,
  p_commit_sha text,
  p_artifacts jsonb
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_status public.dataset_version_status;
  v_current boolean;
  v_mismatch integer;
  v_expected integer;
begin
  if p_commit_sha is null or p_commit_sha !~ '^[0-9a-f]{40}$' then
    raise exception 'approved commit sha required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_artifacts) is distinct from 'array' then
    raise exception 'artifacts must be an array' using errcode = '22023';
  end if;

  select source_id, status, is_current into v_source, v_status, v_current
  from public.dataset_versions where id = p_version_id for update;
  if v_source is null then
    raise exception 'dataset version not found' using errcode = 'BIB02';
  end if;
  if v_status = 'published' and v_current then
    return 'noop';
  end if;
  if v_status <> 'validated' then
    raise exception 'only a validated candidate can be promoted (status=%)', v_status using errcode = 'BIB04';
  end if;

  select count(*) into v_expected from public.dataset_artifacts where dataset_version_id = p_version_id;
  if v_expected = 0 or v_expected <> jsonb_array_length(p_artifacts) then
    raise exception 'artifact set mismatch' using errcode = 'BIB06';
  end if;
  select count(*) into v_mismatch
  from public.dataset_artifacts a
  where a.dataset_version_id = p_version_id
    and not exists (
      select 1 from jsonb_array_elements(p_artifacts) x
      where x->>'name' = a.name and x->>'sha256' = a.sha256);
  if v_mismatch > 0 then
    raise exception 'artifact hash mismatch (% file(s))', v_mismatch using errcode = 'BIB06';
  end if;

  update public.dataset_versions
     set is_current = false, status = 'superseded'
   where source_id = v_source and is_current;
  update public.dataset_versions
     set is_current = true, status = 'published', published_at = now(), approved_commit_sha = p_commit_sha
   where id = p_version_id;
  return 'published';
end $$;

-- ---------------------------------------------------------------------------
-- Repli sur une version déjà publiée auparavant (statut superseded).
-- ---------------------------------------------------------------------------
create or replace function public.rollback_dataset_version(p_version_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_status public.dataset_version_status;
  v_current boolean;
begin
  select source_id, status, is_current into v_source, v_status, v_current
  from public.dataset_versions where id = p_version_id for update;
  if v_source is null then
    raise exception 'dataset version not found' using errcode = 'BIB02';
  end if;
  if v_current then
    return 'noop';
  end if;
  if v_status <> 'superseded' then
    raise exception 'only a previously published version can be restored (status=%)', v_status using errcode = 'BIB04';
  end if;
  if not exists (select 1 from public.dataset_artifacts where dataset_version_id = p_version_id) then
    raise exception 'version has no artifacts' using errcode = 'BIB06';
  end if;
  update public.dataset_versions set is_current = false, status = 'superseded'
   where source_id = v_source and is_current;
  update public.dataset_versions set is_current = true, status = 'published'
   where id = p_version_id;
  return 'restored';
end $$;

revoke all on function public.promote_dataset_version(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.rollback_dataset_version(uuid) from public, anon, authenticated;
grant execute on function public.promote_dataset_version(uuid, text, jsonb) to service_role;
grant execute on function public.rollback_dataset_version(uuid) to service_role;

-- La publication non vérifiée n'est plus accessible au service applicatif.
revoke execute on function public.publish_dataset_version(uuid) from service_role;

-- Une seule préparation active par version (protection contre les exécutions
-- concurrentes du pipeline).
create unique index if not exists ingestion_runs_one_running_build_idx
  on public.ingestion_runs (source_id, kind)
  where status = 'running' and kind in ('build', 'publish');
