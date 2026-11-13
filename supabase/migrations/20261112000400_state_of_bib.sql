-- ============================================================================
-- BIB — 0004 : State of BIB historisé
-- PostgreSQL : sources, versions, exécutions, définitions et observations.
-- Storage (bib-sob-snapshots, public) : snapshots JSON complets, immuables,
-- versionnés : versions/<provider_version>/<fichier>.json. Le pipeline ne
-- téléverse un snapshot qu'APRÈS validation locale ; le pointeur « courant »
-- n'est déplacé qu'après succès complet (publish_dataset_version).
-- Les chiffres couvrent l'Afrique et les Caraïbes : ils ne mesurent pas la
-- diaspora.
-- ============================================================================

do $$ begin
  create type public.dataset_version_status as enum
    ('detected', 'processing', 'validated', 'published', 'superseded', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.run_status as enum ('running', 'succeeded', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists public.data_sources (
  id           text primary key check (id ~ '^[a-z0-9-]+$'),
  name         text not null,
  url          text,
  license      text not null,
  license_url  text,
  attribution  text not null,
  scope_note   text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Source actuellement utilisée par data-pipeline/build_data.py.
insert into public.data_sources (id, name, url, license, license_url, attribution, scope_note)
values (
  'electric-capital-osdd',
  'Electric Capital Open Source Developer Data',
  'https://opendevdata.org',
  'CC BY 4.0',
  'https://creativecommons.org/licenses/by/4.0/',
  'Electric Capital Open Source Developer Data (CC BY 4.0)',
  'Africa + Caribbean geographic scope; does not measure diaspora developers located elsewhere.'
)
on conflict (id) do nothing;

create table if not exists public.dataset_versions (
  id               uuid primary key default gen_random_uuid(),
  source_id        text not null references public.data_sources (id),
  provider_version text not null,
  as_of_date       date,                 -- date de référence de la donnée (snapshot_date)
  period_start     date,
  period_end       date,
  status           public.dataset_version_status not null default 'detected',
  pipeline_version text,
  detected_at      timestamptz not null default now(),
  processed_at     timestamptz,
  published_at     timestamptz,
  is_current       boolean not null default false,
  block_number     bigint,
  notes            text,
  unique (source_id, provider_version)
);

create unique index if not exists dataset_versions_one_current_idx
  on public.dataset_versions (source_id) where is_current;

create table if not exists public.ingestion_runs (
  id                 uuid primary key default gen_random_uuid(),
  source_id          text not null references public.data_sources (id),
  dataset_version_id uuid references public.dataset_versions (id) on delete set null,
  kind               text not null check (kind in ('version_check', 'build', 'publish')),
  trigger            text not null default 'schedule' check (trigger in ('schedule', 'manual')),
  status             public.run_status not null default 'running',
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  message            text,
  details            jsonb not null default '{}'::jsonb
);

create index if not exists ingestion_runs_recent_idx on public.ingestion_runs (source_id, started_at desc);

create table if not exists public.metric_definitions (
  key          text primary key check (key ~ '^[a-z0-9_]+$'),
  label_fr     text not null,
  label_en     text not null,
  label_es     text,
  unit         text not null default 'count',
  methodology  text not null
);

insert into public.metric_definitions (key, label_fr, label_en, label_es, unit, methodology) values
  ('devs_active_28d', 'Développeurs actifs (28 jours)', 'Active developers (28 days)', 'Desarrolladores activos (28 días)', 'count',
   'Distinct in-scope developers with activity in the last 28 days of the snapshot.'),
  ('ecosystems', 'Écosystèmes', 'Ecosystems', 'Ecosistemas', 'count',
   'Distinct ecosystems touched by in-scope developers.'),
  ('countries', 'Pays', 'Countries', 'Países', 'count',
   'Distinct countries with at least one in-scope developer.'),
  ('cities', 'Villes', 'Cities', 'Ciudades', 'count',
   'Distinct cities with at least one in-scope developer (when city data is available).'),
  ('commits_lifetime', 'Commits cumulés', 'Lifetime commits', 'Commits acumulados', 'count',
   'All-time commits by in-scope developers.'),
  ('country_devs_active_28d', 'Développeurs actifs par pays', 'Active developers by country', 'Desarrolladores activos por país', 'count',
   'Active developers (28 days) per in-scope country.'),
  ('city_devs_active_28d', 'Développeurs actifs par ville', 'Active developers by city', 'Desarrolladores activos por ciudad', 'count',
   'Active developers (28 days) per city, top cities only.')
on conflict (key) do nothing;

create table if not exists public.metric_observations (
  id                 bigint generated always as identity primary key,
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  metric_key         text not null references public.metric_definitions (key),
  dimension_type     text not null default 'total'
                       check (dimension_type in ('total', 'country', 'city', 'ecosystem', 'cohort', 'month')),
  dimension_value    text not null default '',
  period_start       date,
  period_end         date,
  as_of_date         date not null,
  value              numeric not null,
  unique nulls not distinct (dataset_version_id, metric_key, dimension_type, dimension_value, period_start)
);

create index if not exists metric_observations_series_idx
  on public.metric_observations (metric_key, dimension_type, dimension_value, as_of_date);

create table if not exists public.dataset_artifacts (
  id                 uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  name               text not null check (name ~ '^[a-z0-9_-]+\.json$'),
  storage_path       text not null unique,
  sha256             text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes         bigint not null check (size_bytes > 0),
  created_at         timestamptz not null default now(),
  unique (dataset_version_id, name)
);

-- Publication atomique et idempotente d'une version validée.
create or replace function public.publish_dataset_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  v_status public.dataset_version_status;
  v_artifacts integer;
begin
  select source_id, status into v_source, v_status
  from public.dataset_versions where id = p_version_id for update;

  if v_source is null then
    raise exception 'dataset version % not found', p_version_id;
  end if;
  if v_status = 'published' then
    return; -- déjà publiée : idempotent
  end if;
  if v_status <> 'validated' then
    raise exception 'dataset version % must be validated before publication (status=%)', p_version_id, v_status;
  end if;

  select count(*) into v_artifacts from public.dataset_artifacts where dataset_version_id = p_version_id;
  if v_artifacts = 0 then
    raise exception 'dataset version % has no artifacts', p_version_id;
  end if;

  update public.dataset_versions
     set is_current = false, status = 'superseded'
   where source_id = v_source and is_current;

  update public.dataset_versions
     set is_current = true, status = 'published', published_at = now()
   where id = p_version_id;
end;
$$;

revoke all on function public.publish_dataset_version(uuid) from public, anon, authenticated;
grant execute on function public.publish_dataset_version(uuid) to service_role;

-- RLS -------------------------------------------------------------------------
alter table public.data_sources enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.metric_definitions enable row level security;
alter table public.metric_observations enable row level security;
alter table public.dataset_artifacts enable row level security;

create policy data_sources_public_read on public.data_sources
  for select to anon, authenticated using (true);
create policy metric_definitions_public_read on public.metric_definitions
  for select to anon, authenticated using (true);
create policy dataset_versions_public_read on public.dataset_versions
  for select to anon, authenticated using (status in ('published', 'superseded'));
create policy metric_observations_public_read on public.metric_observations
  for select to anon, authenticated
  using (exists (select 1 from public.dataset_versions v
                 where v.id = dataset_version_id and v.status in ('published', 'superseded')));
create policy dataset_artifacts_public_read on public.dataset_artifacts
  for select to anon, authenticated
  using (exists (select 1 from public.dataset_versions v
                 where v.id = dataset_version_id and v.status in ('published', 'superseded')));
create policy ingestion_runs_editor_read on public.ingestion_runs
  for select to authenticated using ((select private.is_editor()));

revoke insert, update, delete on public.data_sources, public.dataset_versions, public.ingestion_runs,
  public.metric_definitions, public.metric_observations, public.dataset_artifacts from anon, authenticated;

-- Storage : snapshots publiés (écriture réservée au pipeline, clé secrète).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bib-sob-snapshots', 'bib-sob-snapshots', true, 52428800, array['application/json'])
on conflict (id) do nothing;
