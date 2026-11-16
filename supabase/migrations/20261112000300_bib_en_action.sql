-- ============================================================================
-- BIB — 0003 : BIB en action (rétrospectives, médias, témoignages, droits)
-- Fichiers : Supabase Storage.
--   bib-media-drafts  (privé)  : imports des éditeurs, brouillons, aperçus
--   bib-media-public  (public) : copies des médias approuvés d'un contenu publié
--   bib-consents      (privé)  : preuves d'autorisation / consentement
-- Les brouillons ne reçoivent jamais d'URL publique durable : la copie vers
-- le bucket public est faite côté serveur à la publication et supprimée au
-- retrait.
-- ============================================================================

do $$ begin
  create type public.media_kind as enum ('image', 'video', 'poster', 'subtitles');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rights_status as enum ('pending', 'approved', 'rejected', 'revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.media_assets (
  id                 uuid primary key default gen_random_uuid(),
  kind               public.media_kind not null,
  draft_path         text not null unique,          -- objet dans bib-media-drafts
  public_path        text unique,                   -- objet dans bib-media-public (si publié)
  mime_type          text not null check (mime_type in (
                       'image/jpeg', 'image/png', 'image/webp', 'image/avif',
                       'video/mp4', 'text/vtt')),
  size_bytes         bigint not null check (size_bytes > 0 and size_bytes <= 209715200),
  width              integer check (width is null or width > 0),
  height             integer check (height is null or height > 0),
  duration_seconds   numeric check (duration_seconds is null or duration_seconds > 0),
  alt_text           jsonb not null default '{}'::jsonb,   -- { "fr": "...", "en": "...", "es": "..." }
  credit             text check (credit is null or char_length(credit) <= 200),
  rights_holder      text check (rights_holder is null or char_length(rights_holder) <= 200),
  rights_reference   text check (rights_reference is null or char_length(rights_reference) <= 300),
  rights_status      public.rights_status not null default 'pending',
  consent_proof_path text,                          -- objet dans bib-consents
  poster_media_id    uuid references public.media_assets (id) on delete set null,
  subtitles_media_id uuid references public.media_assets (id) on delete set null,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint media_public_requires_rights_ck
    check (public_path is null or (rights_status = 'approved' and rights_reference is not null))
);

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function private.set_updated_at();

alter table public.events
  add constraint events_cover_media_fk
  foreign key (cover_media_id) references public.media_assets (id) on delete set null;

create table if not exists public.stories (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  status            public.publication_status not null default 'draft',
  event_id          uuid references public.events (id) on delete set null,
  occurred_on       date,
  cover_media_id    uuid references public.media_assets (id) on delete set null,
  featured_video_id uuid references public.media_assets (id) on delete set null,
  published_at      timestamptz,
  archived_at       timestamptz,
  created_by        uuid references auth.users (id) on delete set null,
  updated_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint stories_published_at_ck check (status <> 'published' or published_at is not null)
);

create index if not exists stories_status_idx on public.stories (status, occurred_on desc);
create index if not exists stories_event_idx on public.stories (event_id);

create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function private.set_updated_at();

create table if not exists public.story_translations (
  story_id        uuid not null references public.stories (id) on delete cascade,
  locale          text not null check (locale in ('fr', 'en', 'es')),
  title           text not null check (char_length(title) between 1 and 200),
  summary         text check (summary is null or char_length(summary) <= 500),
  body            text check (body is null or char_length(body) <= 20000),
  seo_description text check (seo_description is null or char_length(seo_description) <= 300),
  updated_at      timestamptz not null default now(),
  primary key (story_id, locale)
);

create trigger story_translations_set_updated_at
  before update on public.story_translations
  for each row execute function private.set_updated_at();

create table if not exists public.story_media (
  story_id  uuid not null references public.stories (id) on delete cascade,
  media_id  uuid not null references public.media_assets (id) on delete restrict,
  position  integer not null check (position >= 0),
  caption   jsonb not null default '{}'::jsonb,
  primary key (story_id, media_id)
);

create index if not exists story_media_order_idx on public.story_media (story_id, position);

create table if not exists public.testimonials (
  id                 uuid primary key default gen_random_uuid(),
  story_id           uuid references public.stories (id) on delete set null,
  event_id           uuid references public.events (id) on delete set null,
  status             public.publication_status not null default 'draft',
  locale             text not null check (locale in ('fr', 'en', 'es')),
  quote              text not null check (char_length(quote) between 1 and 1200),
  author_name        text not null check (char_length(author_name) between 1 and 120),
  author_role        text check (author_role is null or char_length(author_role) <= 160),
  consent_reference  text not null check (char_length(consent_reference) between 1 and 300),
  consent_proof_path text,
  position           integer not null default 0,
  published_at       timestamptz,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function private.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.media_assets enable row level security;
alter table public.stories enable row level security;
alter table public.story_translations enable row level security;
alter table public.story_media enable row level security;
alter table public.testimonials enable row level security;

-- Lecture publique : uniquement le publié, et pour les médias uniquement
-- les copies publiques approuvées. Les chemins de brouillon et de preuve ne
-- sont exposés qu'aux éditeurs via la vue media_public (ci-dessous).
create policy stories_public_read on public.stories
  for select to anon, authenticated using (status = 'published');
create policy stories_editor_all on public.stories
  for all to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

create policy story_translations_public_read on public.story_translations
  for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.status = 'published'));
create policy story_translations_editor_all on public.story_translations
  for all to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

create policy story_media_public_read on public.story_media
  for select to anon, authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.status = 'published'));
create policy story_media_editor_all on public.story_media
  for all to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

create policy media_editor_all on public.media_assets
  for all to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

-- Pas de lecture publique directe : le public passe par testimonials_public.
create policy testimonials_editor_all on public.testimonials
  for all to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));

revoke insert, update, delete on public.media_assets, public.stories, public.story_translations,
  public.story_media, public.testimonials from anon;
-- Le public ne lit jamais la table media_assets directement (chemins privés).
revoke select on public.media_assets from anon;

-- Vue publique des médias : seules les colonnes non sensibles des médias
-- copiés dans le bucket public. security_invoker = false : la vue filtre
-- elle-même ce qui est publiable.
create or replace view public.media_public
with (security_barrier = true)
as
select m.id, m.kind, m.public_path, m.mime_type, m.width, m.height,
       m.duration_seconds, m.alt_text, m.credit, m.poster_media_id, m.subtitles_media_id
from public.media_assets m
where m.public_path is not null
  and m.rights_status = 'approved';

revoke all on public.media_public from anon, authenticated;
grant select on public.media_public to anon, authenticated;

-- Témoignages : ne pas exposer la preuve de consentement au public.
create or replace view public.testimonials_public
with (security_barrier = true)
as
select t.id, t.story_id, t.event_id, t.locale, t.quote, t.author_name, t.author_role, t.position, t.published_at
from public.testimonials t
where t.status = 'published';

revoke all on public.testimonials_public from anon, authenticated;
grant select on public.testimonials_public to anon, authenticated;
revoke select on public.testimonials from anon;

-- Storage ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bib-media-drafts', 'bib-media-drafts', false, 209715200,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'text/vtt']),
  ('bib-media-public', 'bib-media-public', true, 209715200,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'text/vtt']),
  ('bib-consents', 'bib-consents', false, 10485760,
     array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Éditeurs : lecture/écriture des brouillons et des preuves.
create policy bib_drafts_editor_select on storage.objects
  for select to authenticated
  using (bucket_id in ('bib-media-drafts', 'bib-consents') and (select private.is_editor()));
create policy bib_drafts_editor_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('bib-media-drafts', 'bib-consents') and (select private.is_editor()));
create policy bib_drafts_editor_update on storage.objects
  for update to authenticated
  using (bucket_id in ('bib-media-drafts', 'bib-consents') and (select private.is_editor()));
create policy bib_drafts_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('bib-media-drafts', 'bib-consents') and (select private.is_editor()));

-- bib-media-public : aucune écriture via l'API publique ; seules les actions
-- serveur (clé secrète, après contrôle de l'habilitation) y copient ou
-- suppriment des objets. La lecture est publique (bucket public).
