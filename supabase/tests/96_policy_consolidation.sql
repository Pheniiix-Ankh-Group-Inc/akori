-- =============================================================================
-- Tests migration 0016 : index de clés étrangères et consolidation RLS.
-- Base jetable uniquement (supabase/tests/run.sh). Les tests de comportement
-- RLS existants (10_security_and_integrity.sql) s'exécutent APRÈS toutes les
-- migrations et couvrent donc déjà les droits consolidés ; ce fichier ajoute
-- les invariants structurels et une matrice de droits explicite.
-- =============================================================================
\set ON_ERROR_STOP 1

-- 1. Index de clés étrangères --------------------------------------------------
select tests.assert(to_regclass('public.automation_settings_updated_by_fk_idx') is not null,
  'index FK automation_settings.updated_by');
select tests.assert(to_regclass('public.dataset_version_deltas_previous_version_id_fk_idx') is not null,
  'index FK dataset_version_deltas.previous_version_id');
select tests.assert(to_regclass('public.dataset_version_deltas_metric_key_fk_idx') is not null,
  'index FK dataset_version_deltas.metric_key');

-- 2. Une seule policy permissive par (table, rôle, action) ---------------------
select tests.assert(not exists (
  select 1
  from pg_policies p
  cross join lateral unnest(p.roles) as r(role)
  cross join lateral unnest(case when p.cmd = 'ALL' then array['SELECT','INSERT','UPDATE','DELETE'] else array[p.cmd] end) as c(cmd)
  where p.schemaname = 'public' and p.permissive = 'PERMISSIVE'
    and p.tablename in ('events','event_translations','stories','story_media','story_translations')
  group by p.tablename, r.role, c.cmd
  having count(*) > 1),
  'aucune policy permissive multiple sur les 5 tables consolidées');

-- 3. anon : lecture seule, jamais d'écriture -----------------------------------
select tests.assert(not exists (
  select 1 from pg_policies
  where schemaname = 'public'
    and tablename in ('events','event_translations','stories','story_media','story_translations')
    and ('anon' = any(roles) or 'public' = any(roles)) and cmd <> 'SELECT'),
  'anon : aucune policy d''écriture');
select tests.assert((
  select count(*) from pg_policies
  where schemaname = 'public'
    and tablename in ('events','event_translations','stories','story_media','story_translations')
    and 'anon' = any(roles) and cmd = 'SELECT'
    and qual like '%published%') = 5,
  'anon : lecture limitée aux contenus publiés sur les 5 tables');

-- 4. Écritures authenticated toujours gardées par is_editor() ------------------
select tests.assert(not exists (
  select 1 from pg_policies
  where schemaname = 'public'
    and tablename in ('events','event_translations','stories','story_media','story_translations')
    and cmd in ('INSERT','UPDATE','DELETE','ALL')
    and coalesce(qual, '') || coalesce(with_check, '') not like '%is_editor()%'),
  'écritures réservées aux éditeurs');

-- 5. Matrice de droits explicite ----------------------------------------------
-- Un contenu publié et un brouillon par table parente, avec traductions.
insert into public.events (id, slug, starts_at, status)
values ('96000000-0000-0000-0000-000000000001', 'p96-pub', now(), 'draft'),
       ('96000000-0000-0000-0000-000000000002', 'p96-draft', now(), 'draft');
insert into public.event_translations (event_id, locale, title)
select id, 'fr', slug from public.events where id::text like '96000000-%';
update public.events set status = 'published', published_at = now()
where id = '96000000-0000-0000-0000-000000000001';

set role anon;
select tests.assert(tests.visible($$select * from public.events where id::text like '96000000-%'$$) = 1,
  'anon : publié visible, brouillon invisible');
select tests.assert(tests.visible($$select * from public.event_translations where event_id::text like '96000000-%'$$) = 1,
  'anon : traduction du seul événement publié');
reset role;

set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000f');
select tests.assert(tests.visible($$select * from public.events where id::text like '96000000-%'$$) = 1,
  'connecté non éditeur : mêmes droits que anon');
select tests.assert(tests.try($$update public.events set slug = 'x' where id = '96000000-0000-0000-0000-000000000002'$$) = 'ok'
  and (select count(*) from public.events where slug = 'x') = 0,
  'connecté non éditeur : aucune modification possible');
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select tests.assert(tests.visible($$select * from public.events where id::text like '96000000-%'$$) = 1,
  'éditeur désactivé : brouillons invisibles');
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert(tests.visible($$select * from public.events where id::text like '96000000-%'$$) = 2,
  'éditeur actif : publié et brouillon visibles');
select tests.assert(tests.visible($$select * from public.event_translations where event_id::text like '96000000-%'$$) = 2,
  'éditeur actif : toutes les traductions visibles');
select tests.act_as(null);
reset role;
