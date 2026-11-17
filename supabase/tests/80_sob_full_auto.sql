-- Tests de la migration 0013 : State of BIB entièrement automatique.
\set ON_ERROR_STOP on

-- Remise à l'état livré par la migration (les tests précédents changent le mode).
update public.automation_settings set mode = 'auto' where module in ('sob', 'sob_insights');
select tests.assert((select count(*) from public.automation_settings where module in ('sob', 'sob_insights') and mode = 'auto') = 2,
  'modes sob et sob_insights : auto');
select tests.assert((select mode from public.automation_settings where module = 'newsletter') in ('review', 'auto', 'paused'),
  'mode newsletter non modifié par 0013');
select tests.assert((select count(*) from public.editorial_audit where action = 'automation.mode_change' and details ->> 'by' = 'migration 0013') = 1,
  'changement de mode journalisé une seule fois');

-- Base « vide » pour une nouvelle source : première publication sans aucun
-- administrateur ni approbation (scénario J).
insert into public.data_sources (id, name, license, attribution)
values ('auto-source', 'Source auto', 'CC BY 4.0', 'Test') on conflict do nothing;
create temp table saved_editors as select * from public.editors;
delete from public.editors;
select tests.assert((select count(*) from public.editors) = 0, 'aucun éditeur ni administrateur enregistré');

set role service_role;
insert into public.dataset_versions (id, source_id, provider_version, as_of_date, status, validation_report) values
  ('a0000000-0000-0000-0000-000000000001', 'auto-source', 'a1', '2026-05-01', 'validated', '{"passed": true}'),
  ('a0000000-0000-0000-0000-000000000002', 'auto-source', 'a2', '2026-06-01', 'validated', '{"passed": true}'),
  ('a0000000-0000-0000-0000-000000000003', 'auto-source', 'a0', '2026-04-01', 'validated', '{"passed": true}'),
  ('a0000000-0000-0000-0000-000000000004', 'auto-source', 'a3', '2026-07-01', 'validated', '{"passed": true}'),
  ('a0000000-0000-0000-0000-000000000005', 'auto-source', 'a4', '2026-08-01', 'blocked', '{"passed": false}');
insert into public.dataset_artifacts (dataset_version_id, name, storage_path, sha256, size_bytes)
select v.id, f.n, 'auto/' || v.provider_version || '/' || f.n, repeat('b', 64), 10
from public.dataset_versions v
cross join (values ('meta.json'), ('headline.json'), ('country_map.json'), ('top_cities.json'), ('ecosystem_mix.json'), ('tenure_cohort.json')) f(n)
where v.source_id = 'auto-source';
insert into public.metric_observations (dataset_version_id, metric_key, as_of_date, value)
select v.id, 'devs_active_28d', v.as_of_date, 100 from public.dataset_versions v
where v.source_id = 'auto-source' and v.provider_version <> 'a3';

select tests.assert((public.verify_current_dataset('auto-source') ->> 'ok')::boolean = false, 'vérification : aucune version courante au départ');
select tests.assert(public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000001', 'auto') = 'published',
  'première publication automatique, sans administrateur');
select tests.assert((public.verify_current_dataset('auto-source') ->> 'ok')::boolean, 'vérification après publication : conforme');
select tests.assert(public.verify_current_dataset('auto-source') ->> 'version' = 'a1', 'vérification : version courante attendue');

-- Relance (scénario K) : idempotente.
select tests.assert(public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000001') = 'noop', 'relance : aucune republication');

-- Nouvelle version (scénario A) : bascule atomique, historique préservé.
select tests.assert(public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000002') = 'published', 'nouvelle version publiée automatiquement');
select tests.assert((select count(*) from public.dataset_versions where source_id = 'auto-source' and is_current) = 1, 'un seul pointeur courant');
select tests.assert((select status::text from public.dataset_versions where provider_version = 'a1' and source_id = 'auto-source') = 'superseded',
  'ancienne version marquée remplacée');
select tests.assert((select count(*) from public.metric_observations o join public.dataset_versions v on v.id = o.dataset_version_id
                     where v.source_id = 'auto-source' and v.provider_version = 'a1') = 1, 'observations de l''ancienne version conservées');

-- Exécutions désordonnées : le pipeline ne remplace pas la version courante
-- par des données plus anciennes.
select tests.assert(tests.try($$select public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000003')$$) = 'BIB04',
  'candidate plus ancienne que la version courante : refusée au pipeline');
-- Sans observation : publication refusée.
select tests.assert(tests.try($$select public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000004')$$) = 'BIB06',
  'version sans observation : publication refusée');
-- Version bloquée (dataset invalide, scénario E) : jamais publiable, la dernière valide reste courante.
select tests.assert(tests.try($$select public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000005')$$) = 'BIB04',
  'version bloquée : publication refusée');
select tests.assert((select provider_version from public.dataset_versions where source_id = 'auto-source' and is_current) = 'a2',
  'dernière version valide conservée');
select tests.assert((select count(*) from public.editorial_audit where action = 'dataset_version.publish' and details ->> 'by' = 'pipeline'
                     and details ->> 'version' in ('a1', 'a2')) = 2, 'publications automatiques journalisées');

-- Suivi des tentatives et de la quarantaine.
update public.dataset_versions set attempts = attempts + 1, last_attempt_at = now(), quarantine_reason = 'variation non confirmée'
 where id = 'a0000000-0000-0000-0000-000000000005';
select tests.assert((select attempts from public.dataset_versions where id = 'a0000000-0000-0000-0000-000000000005') = 1, 'tentative comptabilisée');
reset role;

-- Accès : anon ne peut ni publier ni vérifier.
set role anon;
select tests.assert(tests.try($$select public.verify_current_dataset('auto-source')$$) = '42501', 'anon : vérification refusée');
select tests.assert(tests.try($$select public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000004')$$) = '42501', 'anon : publication refusée');
reset role;

insert into public.editors select * from saved_editors;

-- Les modes review et paused restent disponibles (évolution future).
update public.automation_settings set mode = 'paused' where module = 'sob';
set role service_role;
select tests.assert(tests.try($$select public.publish_dataset_candidate('a0000000-0000-0000-0000-000000000004')$$) = 'BIB09', 'paused : publication suspendue');
reset role;
update public.automation_settings set mode = 'auto' where module = 'sob';

\echo 'Tests State of BIB automatique (0013) passés.'
