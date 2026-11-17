-- ============================================================================
-- BIB — 0001 : socle administration (habilitations, audit, limites de débit)
-- Projet cible : Supabase BIB dédié (staging puis production). Ne jamais
-- appliquer sur un projet d'un autre produit.
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Horodatage automatique ------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Habilitations éditoriales -------------------------------------------------
-- Une ligne par opérateur autorisé. Aucune inscription publique : les lignes
-- sont créées par un administrateur via SQL ou la clé secrète (voir
-- supabase/bootstrap/first_editor.sql).
do $$ begin
  create type public.editor_role as enum ('editor', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.editors (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         public.editor_role not null default 'editor',
  active       boolean not null default true,
  display_name text check (display_name is null or char_length(display_name) <= 120),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);

create trigger editors_set_updated_at
  before update on public.editors
  for each row execute function private.set_updated_at();

alter table public.editors enable row level security;

-- Fonctions d'autorisation (security definer, hors schéma exposé).
create or replace function private.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e
    where e.user_id = (select auth.uid()) and e.active
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e
    where e.user_id = (select auth.uid()) and e.active and e.role = 'admin'
  );
$$;

revoke all on function private.is_editor() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_editor() to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- Un opérateur lit sa propre habilitation ; un admin lit toutes les lignes.
-- Aucune écriture via l'API publique : gestion par clé secrète ou SQL.
create policy editors_select_self_or_admin on public.editors
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

revoke insert, update, delete on public.editors from anon, authenticated;

-- RPC lisible par le client connecté : est-il éditeur actif ?
create or replace function public.current_editor_role()
returns public.editor_role
language sql
stable
security definer
set search_path = ''
as $$
  select e.role from public.editors e
  where e.user_id = (select auth.uid()) and e.active;
$$;
revoke all on function public.current_editor_role() from public, anon;
grant execute on function public.current_editor_role() to authenticated, service_role;

-- Journal d'audit éditorial --------------------------------------------------
create table if not exists public.editorial_audit (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null check (entity_type in ('event', 'story', 'media', 'testimonial', 'editor', 'sob_insight', 'newsletter')),
  entity_id   uuid,
  details     jsonb not null default '{}'::jsonb
);

create index if not exists editorial_audit_entity_idx on public.editorial_audit (entity_type, entity_id, occurred_at desc);

alter table public.editorial_audit enable row level security;

create policy editorial_audit_insert_editor on public.editorial_audit
  for insert to authenticated
  with check ((select private.is_editor()) and actor_id = (select auth.uid()));

create policy editorial_audit_select_editor on public.editorial_audit
  for select to authenticated
  using ((select private.is_editor()));

revoke update, delete on public.editorial_audit from anon, authenticated;
revoke all on public.editorial_audit from anon;

-- Limitation de débit (formulaires publics) ---------------------------------
-- Utilisée uniquement côté serveur avec la clé secrète.
create table if not exists public.rate_limit_hits (
  bucket_key   text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket_key, window_start)
);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limit_hits as r (bucket_key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Purge opportuniste des fenêtres expirées.
  delete from public.rate_limit_hits where window_start < now() - interval '1 day';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
