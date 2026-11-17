-- ============================================================================
-- BIB — 0002 : événements (source de vérité BIB, sans API Luma)
-- Luma reste une destination de lien d'inscription. Aucune donnée de
-- participants, billets ou paiements n'est stockée ici.
-- La catégorie temporelle (à venir / en cours / passé) est calculée à partir
-- des dates ; seul le statut éditorial est saisi.
-- ============================================================================

do $$ begin
  create type public.publication_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_mode as enum ('in_person', 'online', 'hybrid');
exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  status        public.publication_status not null default 'draft',
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  time_zone     text not null default 'America/Toronto'
                  check (time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$'),
  mode          public.event_mode not null default 'in_person',
  venue_name    text check (venue_name is null or char_length(venue_name) <= 200),
  address       text check (address is null or char_length(address) <= 300),
  city          text check (city is null or char_length(city) <= 120),
  country_code  text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  online_url    text check (online_url is null or online_url ~ '^https://[^\s]+$'),
  luma_url      text check (
                  luma_url is null
                  or luma_url ~ '^https://(www\.)?(lu\.ma|luma\.com)/[A-Za-z0-9._~/-]+$'
                ),
  cover_media_id uuid,  -- clé étrangère ajoutée par la migration 0003
  published_at  timestamptz,
  archived_at   timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  updated_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint events_dates_ck check (ends_at is null or ends_at >= starts_at),
  constraint events_published_at_ck check (status <> 'published' or published_at is not null)
);

create index if not exists events_status_starts_idx on public.events (status, starts_at);
create index if not exists events_starts_idx on public.events (starts_at desc);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

create table if not exists public.event_translations (
  event_id    uuid not null references public.events (id) on delete cascade,
  locale      text not null check (locale in ('fr', 'en', 'es')),
  title       text not null check (char_length(title) between 1 and 200),
  summary     text check (summary is null or char_length(summary) <= 500),
  description text check (description is null or char_length(description) <= 10000),
  updated_at  timestamptz not null default now(),
  primary key (event_id, locale)
);

create trigger event_translations_set_updated_at
  before update on public.event_translations
  for each row execute function private.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_translations enable row level security;

create policy events_public_read on public.events
  for select to anon, authenticated
  using (status = 'published');

create policy events_editor_read on public.events
  for select to authenticated
  using ((select private.is_editor()));

create policy events_editor_insert on public.events
  for insert to authenticated
  with check ((select private.is_editor()) and created_by = (select auth.uid()));

create policy events_editor_update on public.events
  for update to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

create policy events_editor_delete on public.events
  for delete to authenticated
  using ((select private.is_editor()) and status <> 'published');

create policy event_translations_public_read on public.event_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.status = 'published'
  ));

create policy event_translations_editor_all on public.event_translations
  for all to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

revoke insert, update, delete on public.events, public.event_translations from anon;
