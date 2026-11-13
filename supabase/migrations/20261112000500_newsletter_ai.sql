-- ============================================================================
-- BIB — 0005 : veille NEWS, moteur IA, newsletter FR/EN autonome, incidents
-- Brevo reste la source de vérité des contacts et des consentements : aucune
-- liste de contacts n'est recopiée ici. Seule une preuve minimale (empreinte
-- de l'adresse, version du texte de consentement) est conservée.
-- Toutes ces tables sont réservées au serveur (clé secrète) ; les éditeurs
-- peuvent les consulter en lecture.
-- ============================================================================

do $$ begin
  create type public.newsletter_theme as enum
    ('innovation', 'adoption', 'entrepreneurship', 'talent', 'education', 'regulation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.newsletter_rubric as enum
    ('blockchain_insights', 'blockchain_news', 'bib_events', 'bib_highlights');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cycle_status as enum
    ('collecting', 'drafting', 'drafted', 'checking', 'eligible', 'blocked',
     'cancelled', 'sending', 'sent', 'partially_sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.edition_status as enum ('draft', 'validated', 'blocked', 'cancelled', 'sent');
exception when duplicate_object then null; end $$;

-- Sources d'actualités explicitement autorisées --------------------------------
create table if not exists public.news_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 200),
  kind            text not null check (kind in ('rss', 'atom')),
  feed_url        text not null unique check (feed_url ~ '^https://[^\s]+$'),
  homepage_url    text check (homepage_url is null or homepage_url ~ '^https://[^\s]+$'),
  language        text check (language is null or language in ('fr', 'en', 'es', 'pt', 'other')),
  region_tags     text[] not null default '{}',
  usage_terms     text not null,              -- conditions de réutilisation vérifiées
  enabled         boolean not null default false,
  authorized_by   text,
  authorized_at   timestamptz,
  last_fetched_at timestamptz,
  last_status     text,
  created_at      timestamptz not null default now(),
  constraint news_sources_enabled_requires_authorization_ck
    check (not enabled or (authorized_by is not null and authorized_at is not null))
);

create table if not exists public.news_items (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references public.news_sources (id) on delete cascade,
  url            text not null,
  canonical_url  text not null unique,
  fingerprint    text not null unique,    -- empreinte titre normalisé + domaine
  title          text not null,
  summary        text,
  published_at   timestamptz,
  language       text,
  theme          public.newsletter_theme,
  region_tags    text[] not null default '{}',
  fetched_at     timestamptz not null default now()
);

create index if not exists news_items_recent_idx on public.news_items (published_at desc nulls last);

-- Exécutions du moteur IA (budget, traçabilité) -------------------------------
create table if not exists public.ai_runs (
  id                 uuid primary key default gen_random_uuid(),
  purpose            text not null check (purpose in ('newsletter_draft', 'newsletter_regen', 'sob_insight')),
  provider           text not null,
  model              text not null,
  status             public.run_status not null default 'running',
  input_tokens       integer,
  output_tokens      integer,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  error              text
);

-- Cycles hebdomadaires et éditions FR/EN --------------------------------------
create table if not exists public.newsletter_cycles (
  id               uuid primary key default gen_random_uuid(),
  week_start       date not null unique,         -- lundi (heure de Toronto)
  send_slot        timestamptz not null,         -- mercredi 09:00 America/Toronto
  status           public.cycle_status not null default 'collecting',
  regen_attempts   integer not null default 0 check (regen_attempts >= 0),
  cancelled_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger newsletter_cycles_set_updated_at
  before update on public.newsletter_cycles
  for each row execute function private.set_updated_at();

create table if not exists public.newsletter_editions (
  id          uuid primary key default gen_random_uuid(),
  cycle_id    uuid not null references public.newsletter_cycles (id) on delete cascade,
  locale      text not null check (locale in ('fr', 'en')),
  version     integer not null default 1 check (version >= 1),
  status      public.edition_status not null default 'draft',
  subject     text not null,
  preheader   text,
  content     jsonb not null,      -- rubriques structurées
  html        text not null,
  sources     jsonb not null default '[]'::jsonb,
  ai_run_id   uuid references public.ai_runs (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (cycle_id, locale, version)
);

create table if not exists public.edition_checks (
  id         bigint generated always as identity primary key,
  edition_id uuid not null references public.newsletter_editions (id) on delete cascade,
  check_key  text not null,
  blocking   boolean not null,
  passed     boolean not null,
  details    jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create table if not exists public.send_runs (
  id                uuid primary key default gen_random_uuid(),
  cycle_id          uuid not null references public.newsletter_cycles (id) on delete cascade,
  edition_id        uuid not null references public.newsletter_editions (id) on delete cascade,
  locale            text not null check (locale in ('fr', 'en')),
  idempotency_key   text not null unique,
  brevo_campaign_id bigint,
  status            text not null default 'pending'
                      check (status in ('pending', 'created', 'sent', 'failed', 'unknown')),
  requested_at      timestamptz not null default now(),
  confirmed_at      timestamptz,
  error             text
);

-- Incidents opérationnels (alertes e-mail internes) ---------------------------
create table if not exists public.ops_incidents (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  severity    text not null check (severity in ('info', 'warning', 'critical')),
  cycle_id    uuid references public.newsletter_cycles (id) on delete set null,
  message     text not null,
  details     jsonb not null default '{}'::jsonb,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Preuve minimale de consentement (aucune adresse en clair) ------------------
create table if not exists public.newsletter_consents (
  id                   uuid primary key default gen_random_uuid(),
  email_sha256         text not null check (email_sha256 ~ '^[0-9a-f]{64}$'),
  locale               text not null check (locale in ('fr', 'en')),
  consent_text_version text not null,
  source               text not null default 'website',
  created_at           timestamptz not null default now()
);

create index if not exists newsletter_consents_email_idx on public.newsletter_consents (email_sha256);

-- Insights IA State of BIB : jamais publiés automatiquement -------------------
create table if not exists public.sob_insights (
  id                 uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  locale             text not null check (locale in ('fr', 'en', 'es')),
  status             text not null default 'draft'
                       check (status in ('draft', 'approved', 'published', 'rejected')),
  content            jsonb not null,
  sources            jsonb not null default '[]'::jsonb,
  ai_run_id          uuid references public.ai_runs (id) on delete set null,
  approved_by        uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  published_at       timestamptz
);

-- RLS -------------------------------------------------------------------------
alter table public.news_sources enable row level security;
alter table public.news_items enable row level security;
alter table public.ai_runs enable row level security;
alter table public.newsletter_cycles enable row level security;
alter table public.newsletter_editions enable row level security;
alter table public.edition_checks enable row level security;
alter table public.send_runs enable row level security;
alter table public.ops_incidents enable row level security;
alter table public.newsletter_consents enable row level security;
alter table public.sob_insights enable row level security;

create policy news_sources_editor_read on public.news_sources for select to authenticated using ((select private.is_editor()));
create policy news_items_editor_read on public.news_items for select to authenticated using ((select private.is_editor()));
create policy ai_runs_editor_read on public.ai_runs for select to authenticated using ((select private.is_editor()));
create policy newsletter_cycles_editor_read on public.newsletter_cycles for select to authenticated using ((select private.is_editor()));
create policy newsletter_editions_editor_read on public.newsletter_editions for select to authenticated using ((select private.is_editor()));
create policy edition_checks_editor_read on public.edition_checks for select to authenticated using ((select private.is_editor()));
create policy send_runs_editor_read on public.send_runs for select to authenticated using ((select private.is_editor()));
create policy ops_incidents_editor_read on public.ops_incidents for select to authenticated using ((select private.is_editor()));
create policy sob_insights_editor_read on public.sob_insights for select to authenticated using ((select private.is_editor()));
create policy sob_insights_public_read on public.sob_insights for select to anon, authenticated using (status = 'published');
-- newsletter_consents : aucune politique, accès serveur uniquement.

revoke insert, update, delete on public.news_sources, public.news_items, public.ai_runs,
  public.newsletter_cycles, public.newsletter_editions, public.edition_checks, public.send_runs,
  public.ops_incidents, public.newsletter_consents, public.sob_insights from anon, authenticated;
revoke all on public.newsletter_consents from anon, authenticated;
