-- =============================================================================
-- Tests BIB : matrice RLS, fonctions privilégiées, intégrité transactionnelle.
-- À exécuter UNIQUEMENT sur une base jetable après 00_supabase_stub.sql et les
-- migrations (voir supabase/tests/run.sh). Toute assertion en échec lève une
-- exception et interrompt le script (psql -v ON_ERROR_STOP=1).
-- Données fictives uniquement.
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Exécute une requête (droits de l'appelant) et renvoie le SQLSTATE, ou 'ok'.
create or replace function tests.try(p_sql text) returns text
language plpgsql security invoker as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end $$;

-- Nombre de lignes visibles pour l'appelant (-1 si l'accès est refusé).
create or replace function tests.visible(p_sql text) returns bigint
language plpgsql security invoker as $$
declare n bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into n;
  return n;
exception when insufficient_privilege then
  return -1;
end $$;

create or replace function tests.assert(p_ok boolean, p_label text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'ÉCHEC : %', p_label;
  end if;
  raise notice 'ok — %', p_label;
end $$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Bascule d'identité (équivalent du JWT Supabase).
create or replace function tests.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
$$;
grant execute on function tests.act_as(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Données fictives
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'disabled@example.test'),
  ('00000000-0000-0000-0000-00000000000f', 'user@example.test')
on conflict do nothing;
insert into public.editors (user_id, role, active) values
  ('00000000-0000-0000-0000-00000000000a', 'admin', true),
  ('00000000-0000-0000-0000-00000000000e', 'editor', true),
  ('00000000-0000-0000-0000-00000000000d', 'editor', false)
on conflict do nothing;

-- Médias : un approuvé et copié, un sans droits.
insert into public.media_assets (id, kind, draft_path, public_path, mime_type, size_bytes, alt_text, rights_status, rights_reference)
values
  ('10000000-0000-0000-0000-000000000001', 'image', 'uploads/2026/11/10000000-0000-0000-0000-000000000001.jpg',
   'published/10000000-0000-0000-0000-000000000001/a.jpg', 'image/jpeg', 1000, '{"fr":"Photo de groupe"}', 'approved', 'AUT-001'),
  ('10000000-0000-0000-0000-000000000002', 'image', 'uploads/2026/11/10000000-0000-0000-0000-000000000002.jpg',
   null, 'image/jpeg', 1000, '{"fr":"Scène"}', 'pending', null),
  ('10000000-0000-0000-0000-000000000003', 'image', 'uploads/2026/11/10000000-0000-0000-0000-000000000003.jpg',
   'published/10000000-0000-0000-0000-000000000003/c.jpg', 'image/jpeg', 1000, '{}', 'approved', 'AUT-003');

-- =============================================================================
-- 1. Structure
-- =============================================================================
select tests.assert(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r') = 26,
  '26 tables BIB dans public');
select tests.assert(
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  'RLS activée sur toutes les tables');

-- Fonctions SECURITY DEFINER : search_path fixé, aucune exécutable par anon
-- sauf les gardes d'autorisation nécessaires à la RLS.
select tests.assert(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  'toutes les fonctions SECURITY DEFINER fixent search_path');
select tests.assert(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')),
  'aucune fonction SECURITY DEFINER de public exécutable par anon');
select tests.assert(not has_function_privilege('authenticated', 'public.consume_rate_limit(text,integer,integer)', 'execute'),
  'consume_rate_limit réservé au service');
select tests.assert(not has_function_privilege('authenticated', 'public.publish_dataset_version(uuid)', 'execute'),
  'publish_dataset_version réservé au service');
select tests.assert(not has_function_privilege('authenticated', 'public.media_storage_report()', 'execute'),
  'media_storage_report réservé au service');
select tests.assert(not has_function_privilege('anon', 'public.save_event(uuid,timestamptz,jsonb,jsonb)', 'execute'),
  'save_event non exécutable par anon');

-- =============================================================================
-- 2. Visiteur anonyme
-- =============================================================================
set role anon;
select tests.act_as(null);
select tests.assert(tests.try($$insert into public.events (slug, starts_at, created_by) values ('anon-test', now(), null)$$) = '42501',
  'anon : insertion d''événement refusée');
select tests.assert(tests.try($$select * from public.media_assets$$) = '42501', 'anon : media_assets illisible');
select tests.assert(tests.try($$select * from public.newsletter_consents$$) = '42501', 'anon : consentements illisibles');
select tests.assert(tests.try($$select * from public.testimonials$$) = '42501', 'anon : témoignages bruts illisibles');
select tests.assert(tests.visible($$select * from public.editors$$) in (0, -1),
  'anon : habilitations invisibles');
select tests.assert(tests.try($$select public.save_event(null, null, '{}'::jsonb, '[]'::jsonb)$$) = '42501',
  'anon : RPC save_event refusée');
select tests.assert(tests.visible($$select * from public.media_public$$) = 2,
  'anon : media_public expose uniquement les médias approuvés et copiés');
reset role;

-- =============================================================================
-- 3. Utilisateur authentifié sans habilitation (ex. compte Auth historique)
-- =============================================================================
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000f');
select tests.assert(public.current_editor_role() is null, 'sans habilitation : aucun rôle BIB');
select tests.assert(tests.try($$select public.save_event(null, null,
  '{"slug":"x","starts_at":"2026-12-01T18:00:00Z"}'::jsonb, '[{"locale":"fr","title":"X"}]'::jsonb)$$) = '42501',
  'sans habilitation : save_event refusée');
select tests.assert(tests.visible($$select * from public.events$$) = 0, 'sans habilitation : brouillons invisibles');
select tests.assert(tests.visible($$select * from public.editorial_audit$$) = 0, 'sans habilitation : audit invisible');
select tests.assert(tests.try($$insert into public.editors (user_id, role) values ('00000000-0000-0000-0000-00000000000f', 'admin')$$) = '42501',
  'sans habilitation : auto-promotion admin impossible');
select tests.assert(tests.try($$insert into storage.objects (bucket_id, name) values ('bib-media-drafts', 'uploads/2026/11/00000000-0000-0000-0000-000000000099.jpg')$$) = '42501',
  'sans habilitation : import Storage refusé');
reset role;

-- =============================================================================
-- 4. Éditeur désactivé
-- =============================================================================
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select tests.assert(public.current_editor_role() is null, 'éditeur désactivé : aucun rôle');
select tests.assert(tests.try($$select public.save_story(null, null, '{"slug":"y"}'::jsonb, '[{"locale":"fr","title":"Y"}]'::jsonb)$$) = '42501',
  'éditeur désactivé : save_story refusée');
reset role;

-- =============================================================================
-- 5. Éditeur actif : enregistrement transactionnel, concurrence, transitions
-- =============================================================================
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert(public.current_editor_role() = 'editor', 'éditeur actif : rôle editor');
select tests.assert(tests.try($$update public.editors set role = 'admin' where user_id = auth.uid()$$) in ('42501'),
  'éditeur : modification de sa propre habilitation impossible');

-- Création atomique fiche + traductions
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
insert into ids values ('ev', public.save_event(null, null,
  '{"slug":"meetup-test","starts_at":"2026-12-01T23:00:00Z","time_zone":"America/Toronto","mode":"in_person"}'::jsonb,
  '[{"locale":"fr","title":"Rencontre test"},{"locale":"en","title":"Test meetup"},{"locale":"es","title":""}]'::jsonb));
select tests.assert((select count(*) from public.event_translations where event_id = (select v from ids where k = 'ev')) = 2,
  'save_event : 2 traductions créées, langue vide ignorée');
select tests.assert((select count(*) from public.editorial_audit where entity_id = (select v from ids where k = 'ev') and action = 'event.create') = 1,
  'save_event : audit écrit dans la même transaction');

-- Traduction invalide (titre > 200) : rollback complet, fiche inchangée.
select tests.assert(tests.try(format($$select public.save_event(%L, null,
  '{"slug":"meetup-renamed","starts_at":"2026-12-01T23:00:00Z"}'::jsonb,
  jsonb_build_array(jsonb_build_object('locale','fr','title', repeat('x', 250))))$$, (select v from ids where k = 'ev'))) = '23514',
  'save_event : traduction invalide refusée');
select tests.assert((select slug from public.events where id = (select v from ids where k = 'ev')) = 'meetup-test',
  'save_event : aucune écriture partielle après échec d''une traduction');

-- Verrou optimiste : horodatage périmé → BIB01.
select tests.assert(tests.try(format($$select public.save_event(%L, '2000-01-01T00:00:00Z',
  '{"slug":"meetup-test","starts_at":"2026-12-01T23:00:00Z"}'::jsonb, '[{"locale":"fr","title":"A"}]'::jsonb)$$,
  (select v from ids where k = 'ev'))) = 'BIB01',
  'save_event : modification concurrente détectée (BIB01)');

-- Publication refusée avec un visuel sans droits ; acceptée ensuite.
update public.events set cover_media_id = '10000000-0000-0000-0000-000000000002' where id = (select v from ids where k = 'ev');
select tests.assert(tests.try(format($$select public.transition_event(%L, 'publish')$$, (select v from ids where k = 'ev'))) = 'BIB03',
  'transition_event : visuel sans droits → publication refusée');
select tests.assert((select status from public.events where id = (select v from ids where k = 'ev')) = 'draft',
  'transition_event : statut inchangé après refus');
update public.events set cover_media_id = '10000000-0000-0000-0000-000000000001' where id = (select v from ids where k = 'ev');
select tests.assert(public.transition_event((select v from ids where k = 'ev'), 'publish') = 'published', 'transition_event : publication');
select tests.assert(public.transition_event((select v from ids where k = 'ev'), 'publish') = 'noop', 'transition_event : double clic idempotent');
select tests.assert((select count(*) from public.editorial_audit where entity_id = (select v from ids where k = 'ev') and action = 'event.publish') = 1,
  'transition_event : une seule entrée d''audit pour deux clics');

-- Fiche publiée : visuel non diffusable refusé par save_event.
select tests.assert(tests.try(format($$select public.save_event(%L, null,
  '{"slug":"meetup-test","starts_at":"2026-12-01T23:00:00Z","cover_media_id":"10000000-0000-0000-0000-000000000002"}'::jsonb,
  '[{"locale":"fr","title":"Rencontre test"}]'::jsonb)$$, (select v from ids where k = 'ev'))) = 'BIB03',
  'save_event : fiche publiée + visuel non diffusable refusé');

-- Média utilisé par un contenu publié : suppression refusée.
select tests.assert(tests.try($$delete from public.media_assets where id = '10000000-0000-0000-0000-000000000001'$$) = 'BIB03',
  'media_assets : suppression refusée si utilisé par un contenu publié');

-- Rétrospective + galerie
insert into ids values ('st', public.save_story(null, null, '{"slug":"retro-test"}'::jsonb, '[{"locale":"fr","title":"Rétro"}]'::jsonb));
select public.replace_story_media((select v from ids where k = 'st'),
  '[{"media_id":"10000000-0000-0000-0000-000000000001","position":0},{"media_id":"10000000-0000-0000-0000-000000000002","position":1}]'::jsonb);
select tests.assert(tests.try(format($$select public.transition_story(%L, 'publish')$$, (select v from ids where k = 'st'))) = 'BIB03',
  'transition_story : média sans droits dans la galerie → refus');
select public.replace_story_media((select v from ids where k = 'st'),
  '[{"media_id":"10000000-0000-0000-0000-000000000001","position":0}]'::jsonb);
select tests.assert(public.transition_story((select v from ids where k = 'st'), 'publish') = 'published', 'transition_story : publication');

-- Galerie d'un contenu publié : ajout d'un média non diffusable → rollback,
-- l'ancienne galerie est conservée (pas de perte d'associations).
select tests.assert(tests.try(format($$select public.replace_story_media(%L,
  '[{"media_id":"10000000-0000-0000-0000-000000000002","position":0}]'::jsonb)$$, (select v from ids where k = 'st'))) = 'BIB03',
  'replace_story_media : média non diffusable refusé');
select tests.assert((select count(*) from public.story_media where story_id = (select v from ids where k = 'st')
                     and media_id = '10000000-0000-0000-0000-000000000001') = 1,
  'replace_story_media : ancienne galerie intacte après échec');

-- Image sans texte alternatif : non diffusable.
select tests.assert(tests.try(format($$select public.replace_story_media(%L,
  '[{"media_id":"10000000-0000-0000-0000-000000000003","position":0}]'::jsonb)$$, (select v from ids where k = 'st'))) = 'BIB03',
  'image sans texte alternatif refusée');

-- Transition interdite
select tests.assert(tests.try(format($$select public.transition_story(%L, 'delete')$$, (select v from ids where k = 'st'))) = 'BIB04',
  'transition inconnue refusée (BIB04)');

-- Storage : chemin hors convention refusé, chemin conforme accepté.
select tests.assert(tests.try($$insert into storage.objects (bucket_id, name) values ('bib-media-drafts', '../evil.jpg')$$) = '42501',
  'Storage : chemin hors convention refusé');
select tests.assert(tests.try($$insert into storage.objects (bucket_id, name) values ('bib-media-drafts', 'uploads/2026/11/00000000-0000-0000-0000-0000000000aa.jpg')$$) = 'ok',
  'Storage : chemin conforme accepté');
select tests.assert(tests.try($$insert into storage.objects (bucket_id, name) values ('bib-media-public', 'published/x/y.jpg')$$) = '42501',
  'Storage : écriture directe dans le bucket public refusée');
select tests.assert(tests.visible($$select * from public.newsletter_consents$$) in (0, -1),
  'éditeur : preuves de consentement newsletter non lisibles');
reset role;

-- =============================================================================
-- 6. Visiteur : seul le contenu publié est visible
-- =============================================================================
set role anon;
select tests.act_as(null);
select tests.assert(tests.visible($$select * from public.events$$) = 1, 'anon : un événement publié visible');
select tests.assert(tests.visible($$select * from public.stories$$) = 1, 'anon : une rétrospective publiée visible');
reset role;

-- Retrait : redevient invisible
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert(public.transition_story((select v from ids where k = 'st'), 'archive') = 'archived', 'transition_story : archivage');
reset role;
set role anon;
select tests.assert(tests.visible($$select * from public.stories$$) = 0, 'anon : rétrospective archivée invisible');
select tests.assert(tests.visible($$select * from public.story_media$$) = 0, 'anon : galerie archivée invisible');
reset role;

-- =============================================================================
-- 7. Administrateur et service
-- =============================================================================
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(public.current_editor_role() = 'admin', 'admin : rôle admin');
select tests.assert(tests.visible($$select * from public.editors$$) = 3, 'admin : lit toutes les habilitations');
reset role;

set role service_role;
select tests.assert(tests.visible($$select * from public.media_storage_report()$$) >= 1, 'service : rapport de réconciliation disponible');
reset role;

-- Rapport : les fiches de test n'ont aucun objet Storage → signalées, rien supprimé.
select tests.assert((select count(*) from public.media_storage_report() where issue = 'draft_object_missing') >= 3,
  'réconciliation : fichiers privés manquants détectés');
select tests.assert((select count(*) from public.media_assets) = 3, 'réconciliation : aucune suppression automatique');

\echo 'Tous les tests SQL BIB sont passés.'
