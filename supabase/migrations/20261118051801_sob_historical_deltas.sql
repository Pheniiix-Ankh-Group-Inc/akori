-- State of BIB 0014: historical variation facts, never a source-of-truth replacement.
-- Apply explicitly after review, before running the upgraded ingestion pipeline.
create table if not exists public.dataset_version_deltas (
  id bigint generated always as identity primary key,
  dataset_version_id uuid not null references public.dataset_versions(id) on delete cascade,
  previous_version_id uuid not null references public.dataset_versions(id) on delete restrict,
  metric_key text not null references public.metric_definitions(key),
  dimension_type text not null,
  dimension_value text not null default '',
  period_start date,
  previous_value numeric,
  current_value numeric,
  delta numeric,
  relative_change numeric,
  change_kind text not null check (change_kind in ('added','removed','changed')),
  created_at timestamptz not null default now(),
  constraint dataset_version_deltas_distinct_versions check (dataset_version_id <> previous_version_id),
  constraint dataset_version_deltas_unique unique nulls not distinct (
    dataset_version_id,previous_version_id,metric_key,dimension_type,dimension_value,period_start
  )
);

create index if not exists dataset_version_deltas_by_version_idx
  on public.dataset_version_deltas (dataset_version_id,metric_key,dimension_type);

alter table public.dataset_version_deltas enable row level security;
revoke all on public.dataset_version_deltas from public, anon, authenticated;
grant select, insert, update, delete on public.dataset_version_deltas to service_role;
grant usage, select on sequence public.dataset_version_deltas_id_seq to service_role;

comment on table public.dataset_version_deltas is
  'Derived comparison facts between immutable published/archived snapshots; original observations retain their reported values.';

-- Monthly facts can now be queried and compared without reading JSON from Storage.
insert into public.metric_definitions (key,label_fr,label_en,label_es,unit,methodology) values
  ('ecosystem_devs','Développeurs par écosystème et mois','Developers per ecosystem and month',
   'Desarrolladores por ecosistema y mes','count','Provider-derived monthly developer series'),
  ('cohort_devs','Développeurs par ancienneté et mois','Developers by tenure and month',
   'Desarrolladores por antigüedad y mes','count','Provider-derived tenure cohorts by month')
on conflict (key) do nothing;
