-- =============================================================================
-- BIB — Migration 0011 : automatisations V2
-- -----------------------------------------------------------------------------
-- Additive (aucune donnée supprimée). Ajoute :
--  1. automation_settings : modes auto / review / paused par module
--     (State of BIB, analyses IA, newsletter), modifiables par un admin.
--  2. Événements synchronisés depuis Luma (flux iCal) : champs « source_* »
--     gérés par la synchronisation, séparés des compléments éditoriaux BIB
--     (event_translations, couverture) qu'elle ne touche jamais ; journal
--     event_sync_runs ; RPC sync_luma_events (service uniquement), UPSERT
--     idempotent, jamais de suppression (un événement absent du flux est
--     seulement marqué « missing_since »).
--  3. State of BIB sans fusion de PR : publication d'une candidate validée
--     par le pipeline (mode auto) ou par un admin (mode review), rejet,
--     restauration ; rapport de validation enregistré.
--  4. Newsletter éditable : approbation humaine, planification, origine.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Journal d'audit : nouveaux types d'entités
-- ---------------------------------------------------------------------------
alter table public.editorial_audit drop constraint if exists editorial_audit_entity_type_check;
alter table public.editorial_audit add constraint editorial_audit_entity_type_check
  check (entity_type in ('event', 'story', 'media', 'testimonial', 'editor', 'sob_insight', 'newsletter',
                         'dataset_version', 'automation', 'event_sync'));

-- Rôle effectif de l'appelant (service = pipeline / tâches planifiées).
create or replace function private.is_service()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('role', true), '') = 'service_role'
      or coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
$$;
revoke all on function private.is_service() from public;
grant execute on function private.is_service() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Modes d'automatisation
-- ---------------------------------------------------------------------------
create table if not exists public.automation_settings (
  module     text primary key check (module in ('sob', 'sob_insights', 'newsletter')),
  mode       text not null default 'review' check (mode in ('auto', 'review', 'paused')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.automation_settings (module, mode) values
  ('sob', 'review'), ('sob_insights', 'review'), ('newsletter', 'review')
on conflict (module) do nothing;

alter table public.automation_settings enable row level security;
create policy automation_settings_editor_read on public.automation_settings
  for select to authenticated using ((select private.is_editor()));
revoke all on public.automation_settings from anon;
revoke insert, update, delete on public.automation_settings from authenticated;
grant select on public.automation_settings to authenticated;

create or replace function private.automation_mode(p_module text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select mode from public.automation_settings where module = p_module), 'paused');
$$;
revoke all on function private.automation_mode(text) from public;
grant execute on function private.automation_mode(text) to authenticated, service_role;

create or replace function public.set_automation_mode(p_module text, p_mode text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_old text;
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_mode not in ('auto', 'review', 'paused') then
    raise exception 'unknown mode %', p_mode using errcode = '22023';
  end if;
  select mode into v_old from public.automation_settings where module = p_module for update;
  if v_old is null then
    raise exception 'unknown module %', p_module using errcode = 'BIB02';
  end if;
  if v_old = p_mode then
    return 'noop';
  end if;
  update public.automation_settings set mode = p_mode, updated_by = auth.uid(), updated_at = now() where module = p_module;
  insert into public.editorial_audit (actor_id, action, entity_type, details)
  values (auth.uid(), 'automation.mode_change', 'automation', jsonb_build_object('module', p_module, 'from', v_old, 'to', p_mode));
  return p_mode;
end $$;
revoke all on function public.set_automation_mode(text, text) from public, anon;
grant execute on function public.set_automation_mode(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Événements synchronisés depuis Luma
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists source text not null default 'manual' check (source in ('manual', 'luma')),
  add column if not exists external_uid text check (external_uid is null or char_length(external_uid) between 1 and 400),
  add column if not exists recurrence_uid text check (recurrence_uid is null or char_length(recurrence_uid) <= 400),
  add column if not exists source_title text check (source_title is null or char_length(source_title) <= 300),
  add column if not exists source_description text check (source_description is null or char_length(source_description) <= 20000),
  add column if not exists source_location text check (source_location is null or char_length(source_location) <= 500),
  add column if not exists source_url text check (source_url is null or source_url ~ '^https://[^\s]+$'),
  add column if not exists source_image_url text check (source_image_url is null or source_image_url ~ '^https://[^\s]+$'),
  add column if not exists source_status text check (source_status is null or source_status in ('confirmed', 'tentative', 'cancelled')),
  add column if not exists source_sequence integer check (source_sequence is null or source_sequence >= 0),
  add column if not exists source_rrule text check (source_rrule is null or char_length(source_rrule) <= 500),
  add column if not exists source_updated_at timestamptz,
  add column if not exists source_hash text check (source_hash is null or source_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists first_synced_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists missing_since timestamptz,
  add column if not exists sync_run_id uuid;

do $$ begin
  alter table public.events add constraint events_external_uid_key unique (external_uid);
exception when duplicate_object or duplicate_table then null; end $$;
do $$ begin
  alter table public.events add constraint events_luma_uid_ck check (source <> 'luma' or external_uid is not null);
exception when duplicate_object then null; end $$;

create index if not exists events_source_starts_idx on public.events (source, starts_at desc);
create index if not exists events_missing_idx on public.events (missing_since) where missing_since is not null;

create table if not exists public.event_sync_runs (
  id             uuid primary key default gen_random_uuid(),
  trigger        text not null default 'schedule' check (trigger in ('schedule', 'manual', 'upload')),
  status         public.run_status not null default 'running',
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  feed_host      text check (feed_host is null or char_length(feed_host) <= 200),
  feed_bytes     integer check (feed_bytes is null or feed_bytes >= 0),
  feed_events    integer not null default 0 check (feed_events >= 0),
  created_count  integer not null default 0,
  updated_count  integer not null default 0,
  unchanged_count integer not null default 0,
  cancelled_count integer not null default 0,
  missing_count  integer not null default 0,
  restored_count integer not null default 0,
  earliest_start timestamptz,
  latest_start   timestamptz,
  warnings       jsonb not null default '[]'::jsonb,
  error          text check (error is null or char_length(error) <= 1000),
  requested_by   uuid references auth.users (id) on delete set null
);
create index if not exists event_sync_runs_started_idx on public.event_sync_runs (started_at desc);
create index if not exists event_sync_runs_requested_by_fk_idx on public.event_sync_runs (requested_by);

do $$ begin
  alter table public.events add constraint events_sync_run_fk foreign key (sync_run_id) references public.event_sync_runs (id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists events_sync_run_id_fk_idx on public.events (sync_run_id);

alter table public.event_sync_runs enable row level security;
create policy event_sync_runs_editor_read on public.event_sync_runs
  for select to authenticated using ((select private.is_editor()));
revoke all on public.event_sync_runs from anon;
revoke insert, update, delete on public.event_sync_runs from authenticated;
grant select on public.event_sync_runs to authenticated;

-- Les champs Luma ne sont jamais modifiables par les éditeurs (seule la
-- synchronisation les écrit) : un éditeur ne peut modifier que les
-- compléments BIB (couverture) d'un événement Luma.
create or replace function private.protect_luma_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_service() then
    return new;
  end if;
  if old.source = 'luma' and (
       new.source is distinct from old.source or new.external_uid is distinct from old.external_uid
    or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
    or new.time_zone is distinct from old.time_zone or new.luma_url is distinct from old.luma_url
    or new.source_title is distinct from old.source_title or new.source_description is distinct from old.source_description
    or new.source_location is distinct from old.source_location or new.source_url is distinct from old.source_url
    or new.source_status is distinct from old.source_status or new.source_hash is distinct from old.source_hash
    or new.slug is distinct from old.slug) then
    raise exception 'Luma-managed fields are read-only' using errcode = 'BIB07';
  end if;
  return new;
end $$;

drop trigger if exists events_protect_luma_fields on public.events;
create trigger events_protect_luma_fields
  before update on public.events
  for each row execute function private.protect_luma_fields();

-- Création manuelle d'événements par les éditeurs : remplacée par Luma.
drop policy if exists events_editor_insert on public.events;

-- p_events : tableau d'objets normalisés par le code (voir src/lib/events/sync.ts) :
-- {uid, recurrence_uid, slug_base, title, description, location, url, image_url,
--  status, sequence, rrule, updated_at, starts_at, ends_at, time_zone, mode, hash}
-- p_complete : le flux a été lu entièrement (sinon aucun événement n'est
-- marqué absent). Idempotent : rejouer le même flux ne change rien.
create or replace function public.sync_luma_events(p_run_id uuid, p_events jsonb, p_complete boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e jsonb;
  v_existing public.events%rowtype;
  v_created int := 0; v_updated int := 0; v_unchanged int := 0; v_cancelled int := 0; v_restored int := 0; v_missing int := 0;
  v_uids text[] := '{}';
  v_slug text;
  v_known int;
begin
  if not private.is_service() then
    raise exception 'service only' using errcode = '42501';
  end if;
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'events must be an array' using errcode = '22023';
  end if;
  select count(*) into v_known from public.events where source = 'luma';
  -- Un flux complet mais vide alors que des événements existent : anomalie.
  if p_complete and jsonb_array_length(p_events) = 0 and v_known > 0 then
    raise exception 'empty feed refused (% known Luma events)', v_known using errcode = 'BIB08';
  end if;

  for e in select * from jsonb_array_elements(p_events) loop
    if coalesce(e->>'uid', '') = '' or coalesce(e->>'hash', '') !~ '^[0-9a-f]{64}$' or (e->>'starts_at') is null then
      raise exception 'invalid event payload' using errcode = '22023';
    end if;
    v_uids := v_uids || (e->>'uid');
    select * into v_existing from public.events where external_uid = e->>'uid' for update;

    if not found then
      v_slug := left(coalesce(nullif(e->>'slug_base', ''), 'evenement'), 100) || '-' || left(md5(e->>'uid'), 6);
      insert into public.events (
        slug, status, starts_at, ends_at, time_zone, mode, luma_url, published_at,
        source, external_uid, recurrence_uid, source_title, source_description, source_location, source_url,
        source_image_url, source_status, source_sequence, source_rrule, source_updated_at, source_hash,
        first_synced_at, last_synced_at, last_seen_at, sync_run_id)
      values (
        v_slug, 'published', (e->>'starts_at')::timestamptz, (e->>'ends_at')::timestamptz,
        coalesce(nullif(e->>'time_zone', ''), 'America/Toronto'), coalesce(e->>'mode', 'in_person')::public.event_mode,
        nullif(e->>'url', ''), now(),
        'luma', e->>'uid', nullif(e->>'recurrence_uid', ''), e->>'title', nullif(e->>'description', ''),
        nullif(e->>'location', ''), nullif(e->>'url', ''), nullif(e->>'image_url', ''),
        coalesce(nullif(e->>'status', ''), 'confirmed'), (e->>'sequence')::int, nullif(e->>'rrule', ''),
        (e->>'updated_at')::timestamptz, e->>'hash', now(), now(), now(), p_run_id);
      v_created := v_created + 1;
      if e->>'status' = 'cancelled' then v_cancelled := v_cancelled + 1; end if;
    elsif v_existing.source <> 'luma' then
      raise exception 'uid % already used by a manual event', e->>'uid' using errcode = 'BIB07';
    elsif v_existing.source_hash = e->>'hash' then
      update public.events set last_seen_at = now(), missing_since = null where id = v_existing.id;
      v_unchanged := v_unchanged + 1;
      if v_existing.missing_since is not null then v_restored := v_restored + 1; end if;
    else
      update public.events set
        starts_at = (e->>'starts_at')::timestamptz,
        ends_at = (e->>'ends_at')::timestamptz,
        time_zone = coalesce(nullif(e->>'time_zone', ''), 'America/Toronto'),
        mode = coalesce(e->>'mode', 'in_person')::public.event_mode,
        luma_url = nullif(e->>'url', ''),
        recurrence_uid = nullif(e->>'recurrence_uid', ''),
        source_title = e->>'title',
        source_description = nullif(e->>'description', ''),
        source_location = nullif(e->>'location', ''),
        source_url = nullif(e->>'url', ''),
        source_image_url = nullif(e->>'image_url', ''),
        source_status = coalesce(nullif(e->>'status', ''), 'confirmed'),
        source_sequence = (e->>'sequence')::int,
        source_rrule = nullif(e->>'rrule', ''),
        source_updated_at = (e->>'updated_at')::timestamptz,
        source_hash = e->>'hash',
        last_synced_at = now(), last_seen_at = now(), missing_since = null, sync_run_id = p_run_id
      where id = v_existing.id;
      v_updated := v_updated + 1;
      if e->>'status' = 'cancelled' and v_existing.source_status is distinct from 'cancelled' then
        v_cancelled := v_cancelled + 1;
      end if;
      if v_existing.missing_since is not null then v_restored := v_restored + 1; end if;
    end if;
  end loop;

  -- Absent du flux complet : marqué, jamais supprimé (l'historique est conservé).
  if p_complete then
    update public.events set missing_since = now()
    where source = 'luma' and missing_since is null and not (external_uid = any (v_uids));
    get diagnostics v_missing = row_count;
  end if;

  update public.event_sync_runs set
    created_count = v_created, updated_count = v_updated, unchanged_count = v_unchanged,
    cancelled_count = v_cancelled, missing_count = v_missing, restored_count = v_restored,
    feed_events = jsonb_array_length(p_events),
    earliest_start = (select min((x->>'starts_at')::timestamptz) from jsonb_array_elements(p_events) x),
    latest_start = (select max((x->>'starts_at')::timestamptz) from jsonb_array_elements(p_events) x)
  where id = p_run_id;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'unchanged', v_unchanged,
                            'cancelled', v_cancelled, 'missing', v_missing, 'restored', v_restored);
end $$;
revoke all on function public.sync_luma_events(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.sync_luma_events(uuid, jsonb, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 3. State of BIB : publication pilotée par Supabase (sans fusion de PR)
-- ---------------------------------------------------------------------------
alter type public.dataset_version_status add value if not exists 'blocked';
alter type public.dataset_version_status add value if not exists 'rejected';

alter table public.dataset_versions
  add column if not exists validation_report jsonb,
  add column if not exists decided_by uuid references auth.users (id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_note text check (decision_note is null or char_length(decision_note) <= 1000);
create index if not exists dataset_versions_decided_by_fk_idx on public.dataset_versions (decided_by);

-- Le rapport de validation et les décisions ne sont pas publics : anon ne
-- lit que les colonnes descriptives (droits par colonne).
revoke select on public.dataset_versions from anon;
grant select (id, source_id, provider_version, as_of_date, period_start, period_end, status, pipeline_version,
              detected_at, processed_at, published_at, is_current, block_number, notes, candidate_at)
  on public.dataset_versions to anon;

-- L'équipe éditoriale voit toutes les versions (candidates, bloquées,
-- rejetées) et leurs artefacts pour décider dans /admin/state-of-bib.
drop policy if exists dataset_versions_editor_read on public.dataset_versions;
create policy dataset_versions_editor_read on public.dataset_versions
  for select to authenticated using ((select private.is_editor()));
drop policy if exists dataset_artifacts_editor_read on public.dataset_artifacts;
create policy dataset_artifacts_editor_read on public.dataset_artifacts
  for select to authenticated using ((select private.is_editor()));

-- Publication atomique d'une candidate validée.
--  · pipeline (service) : uniquement en mode « auto » ;
--  · administrateur : en mode « auto » ou « review » ; jamais en « paused ».
create or replace function public.publish_dataset_candidate(p_version_id uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.dataset_versions%rowtype;
  v_mode text := private.automation_mode('sob');
  v_admin boolean := private.is_admin();
  v_service boolean := private.is_service();
  v_artifacts int;
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

  select * into v_row from public.dataset_versions where id = p_version_id for update;
  if v_row.id is null then
    raise exception 'dataset version not found' using errcode = 'BIB02';
  end if;
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

  update public.dataset_versions set is_current = false, status = 'superseded'
   where source_id = v_row.source_id and is_current;
  update public.dataset_versions
     set is_current = true, status = 'published', published_at = now(),
         decided_by = auth.uid(), decided_at = now(), decision_note = p_note
   where id = p_version_id;
  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'dataset_version.publish', 'dataset_version', p_version_id,
          jsonb_build_object('mode', v_mode, 'by', case when v_admin then 'admin' else 'pipeline' end,
                             'version', v_row.provider_version));
  return 'published';
end $$;

create or replace function public.reject_dataset_candidate(p_version_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_status text;
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  select status::text into v_status from public.dataset_versions where id = p_version_id for update;
  if v_status is null then
    raise exception 'dataset version not found' using errcode = 'BIB02';
  end if;
  if v_status not in ('validated', 'blocked') then
    raise exception 'only a pending candidate can be rejected (status=%)', v_status using errcode = 'BIB04';
  end if;
  update public.dataset_versions
     set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_reason, 1000)
   where id = p_version_id;
  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'dataset_version.reject', 'dataset_version', p_version_id, jsonb_build_object('reason', left(p_reason, 300)));
  return 'rejected';
end $$;

-- Restauration d'une version publiée auparavant (admin ou pipeline).
create or replace function public.restore_dataset_version(p_version_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_source text; v_status text; v_current boolean;
begin
  if not private.is_admin() and not private.is_service() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select source_id, status::text, is_current into v_source, v_status, v_current
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
  update public.dataset_versions set is_current = false, status = 'superseded' where source_id = v_source and is_current;
  update public.dataset_versions set is_current = true, status = 'published', decided_by = auth.uid(), decided_at = now()
   where id = p_version_id;
  insert into public.editorial_audit (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'dataset_version.restore', 'dataset_version', p_version_id);
  return 'restored';
end $$;

revoke all on function public.publish_dataset_candidate(uuid, text) from public, anon;
revoke all on function public.reject_dataset_candidate(uuid, text) from public, anon;
revoke all on function public.restore_dataset_version(uuid) from public, anon;
grant execute on function public.publish_dataset_candidate(uuid, text) to authenticated, service_role;
grant execute on function public.reject_dataset_candidate(uuid, text) to authenticated;
grant execute on function public.restore_dataset_version(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Newsletter : édition humaine
-- ---------------------------------------------------------------------------
alter table public.newsletter_cycles
  add column if not exists origin text not null default 'auto' check (origin in ('auto', 'manual')),
  add column if not exists approved_by uuid references auth.users (id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists created_by uuid references auth.users (id) on delete set null;
create index if not exists newsletter_cycles_approved_by_fk_idx on public.newsletter_cycles (approved_by);
create index if not exists newsletter_cycles_created_by_fk_idx on public.newsletter_cycles (created_by);

alter table public.newsletter_editions
  add column if not exists edited_by uuid references auth.users (id) on delete set null,
  add column if not exists origin text not null default 'ai' check (origin in ('ai', 'human'));
create index if not exists newsletter_editions_edited_by_fk_idx on public.newsletter_editions (edited_by);

-- ---------------------------------------------------------------------------
-- 5. Compléments éditoriaux BIB d'un événement (Luma reste la source)
-- save_event n'accepte plus de création : un événement naît dans Luma.
-- Pour un événement Luma, seuls la couverture et les traductions éditoriales
-- (titre/résumé/description BIB, facultatifs) sont modifiables ; les
-- événements manuels historiques restent modifiables comme avant.
-- ---------------------------------------------------------------------------
create or replace function public.save_event(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_event jsonb,
  p_translations jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.events%rowtype;
  v_locales text[];
  v_cover uuid := (p_event->>'cover_media_id')::uuid;
begin
  perform private.assert_editor();
  if p_id is null then
    raise exception 'events are created in Luma' using errcode = 'BIB07';
  end if;
  if jsonb_typeof(p_translations) is distinct from 'array' then
    raise exception 'translations must be an array' using errcode = '22023';
  end if;

  select * into v_row from public.events where id = p_id for update;
  if v_row.id is null then
    raise exception 'event not found' using errcode = 'BIB02';
  end if;
  if p_expected_updated_at is not null and v_row.updated_at <> p_expected_updated_at then
    raise exception 'concurrent modification' using errcode = 'BIB01';
  end if;
  if v_row.source = 'manual'
     and not exists (select 1 from jsonb_array_elements(p_translations) t where length(btrim(coalesce(t->>'title', ''))) > 0) then
    raise exception 'a title is required in at least one locale' using errcode = 'BIB05';
  end if;

  if v_row.source = 'luma' then
    update public.events set cover_media_id = v_cover, updated_by = v_uid where id = p_id;
  else
    update public.events set
      slug = coalesce(p_event->>'slug', slug),
      time_zone = coalesce(p_event->>'time_zone', time_zone),
      starts_at = coalesce((p_event->>'starts_at')::timestamptz, starts_at),
      ends_at = (p_event->>'ends_at')::timestamptz,
      mode = coalesce((p_event->>'mode')::public.event_mode, mode),
      venue_name = p_event->>'venue_name', address = p_event->>'address', city = p_event->>'city',
      country_code = p_event->>'country_code', online_url = p_event->>'online_url', luma_url = p_event->>'luma_url',
      cover_media_id = v_cover, updated_by = v_uid
    where id = p_id;
  end if;

  if v_row.status = 'published' and v_cover is not null and not private.media_is_publishable(v_cover) then
    raise exception 'cover media is not publishable' using errcode = 'BIB03';
  end if;

  select coalesce(array_agg(t->>'locale'), '{}') into v_locales
  from jsonb_array_elements(p_translations) t
  where length(btrim(coalesce(t->>'title', ''))) > 0;

  insert into public.event_translations (event_id, locale, title, summary, description)
  select p_id, t->>'locale', btrim(t->>'title'), nullif(t->>'summary', ''), nullif(t->>'description', '')
  from jsonb_array_elements(p_translations) t
  where length(btrim(coalesce(t->>'title', ''))) > 0
  on conflict (event_id, locale) do update
    set title = excluded.title, summary = excluded.summary, description = excluded.description;
  delete from public.event_translations where event_id = p_id and not (locale = any (v_locales));

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (v_uid, 'event.update', 'event', p_id, jsonb_build_object('source', v_row.source));
  return p_id;
end $$;
revoke all on function public.save_event(uuid, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.save_event(uuid, timestamptz, jsonb, jsonb) to authenticated;

-- Publication d'un événement Luma : il suffit d'un titre source (Luma) ou BIB.
create or replace function private.event_has_title(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.event_translations t where t.event_id = p_id)
      or exists (select 1 from public.events e where e.id = p_id and length(btrim(coalesce(e.source_title, ''))) > 0);
$$;
revoke all on function private.event_has_title(uuid) from public;
grant execute on function private.event_has_title(uuid) to authenticated, service_role;

-- transition_event : un titre Luma suffit pour publier un événement synchronisé.
create or replace function public.transition_event(p_id uuid, p_transition text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.publication_status;
  v_cover uuid;
  v_target public.publication_status;
begin
  perform private.assert_editor();
  select e.status, e.cover_media_id into v_status, v_cover from public.events e where e.id = p_id for update;
  if not found then
    raise exception 'event not found' using errcode = 'BIB02';
  end if;

  v_target := case p_transition when 'publish' then 'published' when 'unpublish' then 'draft' when 'archive' then 'archived' end;
  if v_target is null then
    raise exception 'unknown transition %', p_transition using errcode = 'BIB04';
  end if;
  if v_status = v_target then
    return 'noop';
  end if;
  if p_transition in ('unpublish') and v_status <> 'published' then
    raise exception 'transition % not allowed from %', p_transition, v_status using errcode = 'BIB04';
  end if;

  if p_transition = 'publish' then
    if not private.event_has_title(p_id) then
      raise exception 'no title' using errcode = 'BIB05';
    end if;
    if v_cover is not null and not private.media_is_publishable(v_cover) then
      raise exception 'cover media is not publishable' using errcode = 'BIB03';
    end if;
    update public.events set status = 'published', published_at = now(), archived_at = null, updated_by = auth.uid() where id = p_id;
  elsif p_transition = 'archive' then
    update public.events set status = 'archived', archived_at = now(), updated_by = auth.uid() where id = p_id;
  else
    update public.events set status = 'draft', updated_by = auth.uid() where id = p_id;
  end if;

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'event.' || p_transition, 'event', p_id, jsonb_build_object('from', v_status));
  return v_target::text;
end $$;
revoke all on function public.transition_event(uuid, text) from public, anon;
grant execute on function public.transition_event(uuid, text) to authenticated;
