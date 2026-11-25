-- Historique uniforme des tâches planifiées (supervision des CRON).
--
-- Pourquoi une table de plus : event_sync_runs (Luma) et ingestion_runs
-- (State of BIB) sont propres à leur domaine ; la veille d'actualités, les
-- étapes de la newsletter et le rafraîchissement State of BIB n'avaient aucun
-- historique d'exécution. Cette table donne, pour chaque tâche, la même
-- information (début, fin, durée, statut, volume, tentative, identifiants
-- techniques, erreur assainie) et permet au contrôle de santé de repérer les
-- échecs et les exécutions manquantes. Les tables de domaine restent la
-- source détaillée.
--
-- Aucune donnée personnelle : pas d'adresse, pas de contenu, pas de secret.
-- Conservation : 90 jours (purge par /api/cron/health).

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job ~ '^[a-z0-9_.-]{1,64}$'),
  trigger text not null default 'schedule' check (trigger in ('schedule', 'manual', 'pipeline', 'health')),
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  items integer check (items is null or items >= 0),
  attempt integer not null default 1 check (attempt between 1 and 100),
  correlation_id text not null check (char_length(correlation_id) <= 64),
  external_run_id text check (external_run_id is null or external_run_id ~ '^[0-9]{1,20}$'),
  error text check (error is null or char_length(error) <= 500),
  details jsonb not null default '{}'::jsonb
);

comment on table public.cron_runs is 'Supervision des tâches planifiées : une ligne par exécution, sans donnée personnelle. Purge à 90 jours.';

create index if not exists cron_runs_job_started_idx on public.cron_runs (job, started_at desc);
create index if not exists cron_runs_started_idx on public.cron_runs (started_at);

alter table public.cron_runs enable row level security;
create policy cron_runs_editor_read on public.cron_runs for select to authenticated using ((select private.is_editor()));
revoke insert, update, delete on public.cron_runs from anon, authenticated;
