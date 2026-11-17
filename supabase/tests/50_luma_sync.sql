-- =============================================================================
-- Tests BIB : synchronisation Luma → Supabase (migration 0011).
-- S'exécute après 10_security_and_integrity.sql (mêmes comptes fictifs).
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create or replace function tests.ev(p_uid text, p_title text, p_start text, p_hash text, p_status text default 'confirmed')
returns jsonb language sql as $$
  select jsonb_build_object('uid', p_uid, 'slug_base', 'evenement-test', 'title', p_title, 'starts_at', p_start,
    'ends_at', null, 'time_zone', 'America/Toronto', 'mode', 'in_person', 'status', p_status,
    'url', 'https://lu.ma/test-' || left(md5(p_uid), 6), 'hash', repeat(p_hash, 64));
$$;

-- Accès : seul le service synchronise.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(tests.try($$select public.sync_luma_events(gen_random_uuid(), '[]'::jsonb, false)$$) = '42501',
  'sync_luma_events : refusé à un administrateur (service uniquement)');
reset role;
set role anon;
select tests.assert(tests.try($$select public.sync_luma_events(gen_random_uuid(), '[]'::jsonb, false)$$) = '42501',
  'sync_luma_events : refusé à anon');
reset role;

set role service_role;
-- Fixtures closes : le verrou (0012) n'autorise qu'une exécution « running ».
insert into public.event_sync_runs (id, trigger, status) values
  ('80000000-0000-0000-0000-000000000001', 'schedule', 'succeeded'), ('80000000-0000-0000-0000-000000000002', 'schedule', 'succeeded'),
  ('80000000-0000-0000-0000-000000000003', 'schedule', 'succeeded'), ('80000000-0000-0000-0000-000000000004', 'schedule', 'succeeded'),
  ('80000000-0000-0000-0000-000000000005', 'upload', 'succeeded');

-- Import initial : passé, futur, annulé.
select tests.assert(
  (public.sync_luma_events('80000000-0000-0000-0000-000000000001', jsonb_build_array(
    tests.ev('past-1@lu.ma', 'Atelier 2024', '2024-03-10T18:00:00Z', 'a'),
    tests.ev('future-1@lu.ma', 'Meetup 2027', '2027-02-10T23:00:00Z', 'b'),
    tests.ev('cancel-1@lu.ma', 'Panel', '2027-03-01T23:00:00Z', 'c')), true) ->> 'created')::int = 3,
  'import initial : 3 événements créés');
select tests.assert((select count(*) from public.events where source = 'luma' and status = 'published') >= 3,
  'import initial : événements publiés');
select tests.assert((select feed_events from public.event_sync_runs where id = '80000000-0000-0000-0000-000000000001') = 3,
  'journal : nombre d''événements du flux');

-- Rejeu identique : idempotent, aucun doublon.
select tests.assert(
  (public.sync_luma_events('80000000-0000-0000-0000-000000000002', jsonb_build_array(
    tests.ev('past-1@lu.ma', 'Atelier 2024', '2024-03-10T18:00:00Z', 'a'),
    tests.ev('future-1@lu.ma', 'Meetup 2027', '2027-02-10T23:00:00Z', 'b'),
    tests.ev('cancel-1@lu.ma', 'Panel', '2027-03-01T23:00:00Z', 'c')), true) ->> 'unchanged')::int = 3,
  'rejeu : 3 inchangés');
select tests.assert((select count(*) from public.events where external_uid in ('past-1@lu.ma', 'future-1@lu.ma', 'cancel-1@lu.ma')) = 3,
  'rejeu : aucun doublon');

-- Modification (report de date), annulation, disparition temporaire.
select tests.assert(
  public.sync_luma_events('80000000-0000-0000-0000-000000000003', jsonb_build_array(
    tests.ev('future-1@lu.ma', 'Meetup 2027 (reporté)', '2027-02-17T23:00:00Z', 'd'),
    tests.ev('cancel-1@lu.ma', 'Panel', '2027-03-01T23:00:00Z', 'e', 'cancelled')), true)
  = '{"created": 0, "updated": 2, "unchanged": 0, "cancelled": 1, "missing": 1, "restored": 0}'::jsonb,
  'modification + annulation + 1 absent du flux');
select tests.assert((select starts_at from public.events where external_uid = 'future-1@lu.ma') = '2027-02-17T23:00:00Z',
  'report : nouvelle date enregistrée');
select tests.assert((select source_status from public.events where external_uid = 'cancel-1@lu.ma') = 'cancelled',
  'annulation : statut source « cancelled » conservé (événement non supprimé)');
select tests.assert((select missing_since is not null and status = 'published' from public.events where external_uid = 'past-1@lu.ma'),
  'événement absent du flux : marqué, jamais supprimé (historique conservé)');

-- Réapparition : restauré.
select tests.assert(
  (public.sync_luma_events('80000000-0000-0000-0000-000000000004', jsonb_build_array(
    tests.ev('past-1@lu.ma', 'Atelier 2024', '2024-03-10T18:00:00Z', 'a')), false) ->> 'restored')::int = 1,
  'réapparition : événement restauré');
select tests.assert((select missing_since is null from public.events where external_uid = 'past-1@lu.ma'),
  'réapparition : marqueur d''absence effacé');

-- Flux complet vide alors que des événements existent : refusé.
select tests.assert(tests.try($$select public.sync_luma_events('80000000-0000-0000-0000-000000000005', '[]'::jsonb, true)$$) = 'BIB08',
  'flux complet vide refusé (protection contre une suppression accidentelle)');
-- Charge utile invalide : refusée.
select tests.assert(tests.try($$select public.sync_luma_events('80000000-0000-0000-0000-000000000005', '[{"uid":"x"}]'::jsonb, false)$$) = '22023',
  'événement sans date ni empreinte refusé');
reset role;

-- Éditeur : champs Luma en lecture seule, compléments BIB autorisés.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert(tests.try($$update public.events set source_title = 'Piraté' where external_uid = 'future-1@lu.ma'$$) = 'BIB07',
  'éditeur : titre Luma non modifiable');
select tests.assert(tests.try($$update public.events set starts_at = now() where external_uid = 'future-1@lu.ma'$$) = 'BIB07',
  'éditeur : date Luma non modifiable');
select tests.assert(tests.try($$insert into public.events (slug, starts_at, created_by) values ('manuel', now(), auth.uid())$$) = '42501',
  'éditeur : création manuelle d''événement refusée');
select public.save_event((select id from public.events where external_uid = 'future-1@lu.ma'), null, '{}'::jsonb,
  '[{"locale":"fr","title":"Meetup BIB Toronto","summary":"Complément éditorial BIB"}]'::jsonb);
select tests.assert((select title from public.event_translations t join public.events e on e.id = t.event_id
  where e.external_uid = 'future-1@lu.ma' and t.locale = 'fr') = 'Meetup BIB Toronto',
  'éditeur : complément éditorial enregistré séparément');
reset role;

-- La synchronisation suivante ne touche pas aux compléments BIB.
set role service_role;
insert into public.event_sync_runs (id, trigger, status) values ('80000000-0000-0000-0000-000000000006', 'schedule', 'succeeded');
select public.sync_luma_events('80000000-0000-0000-0000-000000000006', jsonb_build_array(
  tests.ev('future-1@lu.ma', 'Meetup 2027 — salle changée', '2027-02-17T23:00:00Z', 'f')), false);
reset role;
select tests.assert((select title from public.event_translations t join public.events e on e.id = t.event_id
  where e.external_uid = 'future-1@lu.ma' and t.locale = 'fr') = 'Meetup BIB Toronto',
  'synchronisation : complément éditorial BIB préservé');
select tests.assert((select source_title from public.events where external_uid = 'future-1@lu.ma') = 'Meetup 2027 — salle changée',
  'synchronisation : champ Luma mis à jour');

-- Visiteur : événements publiés lisibles, journal invisible.
set role anon;
select tests.assert(tests.visible($$select * from public.events where source = 'luma'$$) >= 3, 'anon : événements Luma publiés visibles');
select tests.assert(tests.try($$select * from public.event_sync_runs$$) = '42501', 'anon : journal de synchronisation invisible');
reset role;

\echo 'Tests de synchronisation Luma passés.'
