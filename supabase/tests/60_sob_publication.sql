-- =============================================================================
-- Tests BIB : publication State of BIB pilotée par Supabase (modes, 0011).
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into public.data_sources (id, name, license, attribution)
values ('test-source', 'Source de test', 'CC BY 4.0', 'Test') on conflict do nothing;
insert into public.dataset_versions (id, source_id, provider_version, as_of_date, status, validation_report) values
  ('90000000-0000-0000-0000-000000000001', 'test-source', 'v1', '2026-01-01', 'validated', '{"passed": true}'),
  ('90000000-0000-0000-0000-000000000002', 'test-source', 'v2', '2026-02-01', 'validated', '{"passed": true}'),
  ('90000000-0000-0000-0000-000000000003', 'test-source', 'v3', '2026-03-01', 'validated', '{"passed": false, "errors": ["divergence"]}'),
  ('90000000-0000-0000-0000-000000000004', 'test-source', 'v4', '2026-04-01', 'validated', '{"passed": true}');
insert into public.dataset_artifacts (dataset_version_id, name, storage_path, sha256, size_bytes)
select v.id, f.n, 'test/' || v.provider_version || '/' || f.n, repeat('a', 64), 10
from public.dataset_versions v
cross join (values ('meta.json'), ('headline.json'), ('country_map.json'), ('top_cities.json'), ('ecosystem_mix.json'), ('tenure_cohort.json')) f(n)
where v.source_id = 'test-source';
insert into public.metric_observations (dataset_version_id, metric_key, as_of_date, value)
select v.id, 'devs_active_28d', v.as_of_date, 100 from public.dataset_versions v where v.source_id = 'test-source';

-- Le MVP est en mode auto (0013) ; le mode review reste disponible : on le
-- sélectionne ici pour vérifier qu'il fonctionne encore.
update public.automation_settings set mode = 'review' where module = 'sob';

-- Mode review : le pipeline ne publie pas seul.
set role service_role;
select tests.assert(tests.try($$select public.publish_dataset_candidate('90000000-0000-0000-0000-000000000001')$$) = 'BIB09',
  'review : publication automatique refusée au pipeline');
reset role;

-- Mode review : l'admin approuve.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert(tests.try($$select public.publish_dataset_candidate('90000000-0000-0000-0000-000000000001')$$) = '42501',
  'éditeur (non admin) : publication refusée');
select tests.assert(tests.try($$select public.set_automation_mode('sob', 'auto')$$) = '42501',
  'éditeur : changement de mode refusé');
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(public.publish_dataset_candidate('90000000-0000-0000-0000-000000000001', 'relu') = 'published', 'review : approbation humaine publie');
select tests.assert(public.publish_dataset_candidate('90000000-0000-0000-0000-000000000001') = 'noop', 'approbation idempotente');
select tests.assert(tests.try($$select public.publish_dataset_candidate('90000000-0000-0000-0000-000000000003')$$) = 'BIB06',
  'candidate en échec de validation : publication bloquée');
select tests.assert(public.reject_dataset_candidate('90000000-0000-0000-0000-000000000003', 'divergence anormale') = 'rejected', 'rejet humain');

-- Mode auto : le pipeline publie seul.
select tests.assert(public.set_automation_mode('sob', 'auto') = 'auto', 'admin : passage en mode auto');
reset role;
set role service_role;
select tests.assert(public.publish_dataset_candidate('90000000-0000-0000-0000-000000000002') = 'published', 'auto : publication par le pipeline');
reset role;
select tests.assert((select count(*) from public.dataset_versions where source_id = 'test-source' and is_current) = 1,
  'une seule version courante (bascule atomique)');
select tests.assert((select status::text from public.dataset_versions where id = '90000000-0000-0000-0000-000000000001') = 'superseded',
  'version précédente conservée (historisée)');

-- Mode paused : collecte autorisée, publication suspendue pour tous.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select public.set_automation_mode('sob', 'paused');
select tests.assert(tests.try($$select public.publish_dataset_candidate('90000000-0000-0000-0000-000000000004')$$) = 'BIB09',
  'paused : publication suspendue (même pour un admin)');

-- Restauration de la version précédente.
select tests.assert(public.restore_dataset_version('90000000-0000-0000-0000-000000000001') = 'restored', 'restauration (rollback)');
select tests.assert((select provider_version from public.dataset_versions where source_id = 'test-source' and is_current) = 'v1',
  'rollback : v1 redevient courante');
select tests.assert((select count(*) from public.editorial_audit where entity_type in ('dataset_version', 'automation')) >= 5,
  'décisions journalisées');
select public.set_automation_mode('sob', 'review');
reset role;

-- L'équipe voit les candidates non publiées et leurs artefacts ; anon non.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert((select count(*) from public.dataset_versions where source_id = 'test-source' and status::text in ('validated', 'blocked', 'rejected')) >= 1,
  'éditeur : candidates visibles');
select tests.assert((select count(*) from public.dataset_artifacts a join public.dataset_versions v on v.id = a.dataset_version_id
                     where v.source_id = 'test-source' and v.status::text not in ('published', 'superseded')) >= 6,
  'éditeur : artefacts des candidates visibles');
reset role;
select tests.act_as(null);
set role anon;
select tests.assert(tests.try($$select id from public.dataset_versions$$) = '42501', 'anon : versions illisibles');
select tests.assert(tests.try($$select * from public.dataset_artifacts$$) = '42501', 'anon : artefacts illisibles');
select tests.assert(tests.try($$select * from public.metric_observations$$) = '42501', 'anon : observations illisibles');
select tests.assert(tests.try($$select * from public.data_sources$$) = '42501', 'anon : sources illisibles hors page légale');
select tests.assert(tests.try($$select * from public.sob_insights$$) = '42501', 'anon : analyses lues côté serveur uniquement');
reset role;

-- Le rapport de validation n'est pas public.
set role anon;
select tests.assert(tests.try($$select validation_report from public.dataset_versions$$) = '42501', 'anon : rapport de validation illisible');
reset role;
select tests.act_as(null);

\echo 'Tests de publication State of BIB passés.'
