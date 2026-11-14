-- =============================================================================
-- Tests BIB : gouvernance State of BIB (candidate → promotion vérifiée → repli).
-- Base jetable uniquement. Exécuté après 10_security_and_integrity.sql.
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into public.dataset_versions (id, source_id, provider_version, status, as_of_date)
values ('20000000-0000-0000-0000-000000000001', 'electric-capital-osdd', 'v-old', 'validated', '2026-04-01'),
       ('20000000-0000-0000-0000-000000000002', 'electric-capital-osdd', 'v-new', 'validated', '2026-11-01');
insert into public.dataset_artifacts (dataset_version_id, name, storage_path, sha256, size_bytes) values
  ('20000000-0000-0000-0000-000000000001', 'meta.json', 'versions/v-old/meta.json', repeat('a', 64), 10),
  ('20000000-0000-0000-0000-000000000002', 'meta.json', 'versions/v-new/meta.json', repeat('b', 64), 10),
  ('20000000-0000-0000-0000-000000000002', 'headline.json', 'versions/v-new/headline.json', repeat('c', 64), 10);

set role service_role;
select tests.assert(tests.try($$select public.publish_dataset_version('20000000-0000-0000-0000-000000000001')$$) = '42501',
  'service : publication non vérifiée (publish_dataset_version) retirée');
select tests.assert(public.promote_dataset_version('20000000-0000-0000-0000-000000000001', repeat('1', 40),
  '[{"name":"meta.json","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]') = 'published',
  'promotion : empreintes conformes → publiée');
select tests.assert(tests.try($$select public.promote_dataset_version('20000000-0000-0000-0000-000000000002', repeat('2', 40),
  '[{"name":"meta.json","sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]')$$) = 'BIB06',
  'promotion : fichier manquant → refus');
select tests.assert(tests.try($$select public.promote_dataset_version('20000000-0000-0000-0000-000000000002', repeat('2', 40),
  jsonb_build_array(jsonb_build_object('name','meta.json','sha256',repeat('b',64)), jsonb_build_object('name','headline.json','sha256',repeat('0',64))))$$) = 'BIB06',
  'promotion : empreinte modifiée → refus');
select tests.assert(tests.try($$select public.promote_dataset_version('20000000-0000-0000-0000-000000000002', 'main',
  '[]')$$) = '22023', 'promotion : commit approuvé obligatoire');
reset role;
select tests.assert((select provider_version from public.dataset_versions where is_current) = 'v-old',
  'après refus : la version précédente reste courante');

set role service_role;
select tests.assert(public.promote_dataset_version('20000000-0000-0000-0000-000000000002', repeat('2', 40),
  jsonb_build_array(jsonb_build_object('name','meta.json','sha256',repeat('b',64)), jsonb_build_object('name','headline.json','sha256',repeat('c',64)))) = 'published',
  'promotion : nouvelle version publiée');
select tests.assert(public.rollback_dataset_version('20000000-0000-0000-0000-000000000001') = 'restored', 'repli : version précédente réactivée');
reset role;
select tests.assert((select count(*) from public.dataset_versions where is_current) = 1, 'une seule version courante');
select tests.assert((select provider_version from public.dataset_versions where is_current) = 'v-old', 'repli effectif');

set role anon;
select tests.assert(tests.visible($$select * from public.dataset_versions where status = 'validated'$$) = 0,
  'anon : aucune candidate visible');
reset role;
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(tests.try($$select public.promote_dataset_version('20000000-0000-0000-0000-000000000002', repeat('2',40), '[]')$$) = '42501',
  'admin applicatif : promotion réservée au pipeline');
reset role;
select tests.assert(exists (select 1 from storage.buckets where id = 'bib-sob-candidates' and not public),
  'bucket des candidates privé');

\echo 'Tests de gouvernance State of BIB passés.'
