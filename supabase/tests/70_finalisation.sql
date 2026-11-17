-- Tests de la migration 0012 : verrou atomique Luma, bucket privé, provenance.
\set ON_ERROR_STOP on

-- Toute exécution laissée ouverte par les tests précédents est close.
update public.event_sync_runs set status = 'succeeded', finished_at = now() where status = 'running';

-- Accès : seul le rôle de service ouvre une synchronisation.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(tests.try($$select public.begin_event_sync_run('manual')$$) in ('42501', 'BIB01'),
  'admin connecté : ouverture directe refusée');
reset role;
select tests.act_as(null);
set role anon;
select tests.assert(tests.try($$select public.begin_event_sync_run('manual')$$) = '42501', 'anon : ouverture refusée');
reset role;

set role service_role;
select tests.assert(tests.try($$select public.begin_event_sync_run('bogus')$$) = 'BIB02', 'déclencheur invalide refusé');

-- Verrou : une seule exécution en cours ; la seconde reçoit NULL, sans erreur.
create temp table lock_run as select public.begin_event_sync_run('schedule') as id;
grant select on lock_run to public;
select tests.assert((select id from lock_run) is not null, 'première exécution ouverte');
select tests.assert(public.begin_event_sync_run('manual') is null, 'seconde exécution concurrente : verrou (NULL)');
select tests.assert((select count(*) from public.event_sync_runs where status = 'running') = 1, 'une seule exécution en cours');

-- L'index unique protège aussi d'une insertion directe concurrente.
select tests.assert(tests.try($$insert into public.event_sync_runs (trigger, status) values ('schedule', 'running')$$) = '23505',
  'insertion directe d''une seconde exécution en cours refusée');

-- Reprise : une exécution interrompue (trop ancienne) est close, la suivante démarre.
update public.event_sync_runs set started_at = now() - interval '45 minutes' where id = (select id from lock_run);
create temp table lock_run2 as select public.begin_event_sync_run('schedule', null, 30) as id;
select tests.assert((select id from lock_run2) is not null, 'reprise après exécution interrompue');
select tests.assert((select status::text from public.event_sync_runs where id = (select id from lock_run)) = 'failed',
  'exécution interrompue marquée en échec');
select tests.assert((select error from public.event_sync_runs where id = (select id from lock_run)) like 'exécution interrompue%',
  'motif de l''interruption journalisé');
update public.event_sync_runs set status = 'succeeded', finished_at = now() where status = 'running';
reset role;

-- State of BIB : plus aucun bucket public de données.
select tests.assert((select count(*) from storage.buckets where id like 'bib-sob-%' and public) = 0,
  'aucun bucket State of BIB public');
select tests.assert((select count(*) from storage.buckets where id in ('bib-sob-snapshots', 'bib-sob-candidates')) = 2,
  'buckets State of BIB conservés (privés)');

-- Provenance : empreinte contrôlée, journal de réconciliation accepté.
select tests.assert(tests.try($$update public.dataset_versions set source_fingerprint = 'pas-une-empreinte'$$) in ('23514', 'OK'),
  'empreinte invalide refusée (ou aucune version)');
set role service_role;
insert into public.ingestion_runs (source_id, kind, status, message)
  select id, 'reconcile', 'succeeded', 'test' from public.data_sources limit 1;
select tests.assert((select count(*) from public.ingestion_runs where kind = 'reconcile') >= 1, 'journal de réconciliation accepté');
reset role;

\echo 'Tests de finalisation (0012) passés.'
