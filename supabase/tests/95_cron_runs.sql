-- Tests de la migration 20261125000100 : historique des tâches planifiées.
\set ON_ERROR_STOP on

-- Seul le rôle de service écrit ; anon et éditeurs ne peuvent rien modifier.
set role anon;
select tests.assert(tests.try($$insert into public.cron_runs (job, correlation_id) values ('luma-sync', 'c1')$$) = '42501', 'anon : écriture refusée');
select tests.assert(tests.try($$select count(*) from public.cron_runs$$) = '42501' or (select count(*) from public.cron_runs) = 0, 'anon : aucune ligne lisible');
reset role;
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(tests.try($$insert into public.cron_runs (job, correlation_id) values ('luma-sync', 'c1')$$) = '42501', 'admin connecté : écriture directe refusée');
reset role;
select tests.act_as(null);

set role service_role;
insert into public.cron_runs (job, trigger, status, correlation_id, external_run_id, attempt)
values ('luma-sync', 'schedule', 'success', 'corr-1', '123456789', 2);
select tests.assert(tests.try($$insert into public.cron_runs (job, correlation_id) values ('Luma Sync!', 'c')$$) = '23514', 'nom de tâche invalide refusé');
select tests.assert(tests.try($$insert into public.cron_runs (job, correlation_id, external_run_id) values ('news', 'c', '1;drop')$$) = '23514', 'identifiant d''exécution non numérique refusé');
select tests.assert(tests.try($$insert into public.cron_runs (job, correlation_id, status) values ('news', 'c', 'ok')$$) = '23514', 'statut hors liste refusé');
select tests.assert(tests.try($$insert into public.cron_runs (job, correlation_id, error) values ('news', 'c', repeat('x', 501))$$) = '23514', 'erreur > 500 caractères refusée');
reset role;

-- Lecture : éditeur actif oui, éditeur inactif non.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert((select count(*) from public.cron_runs) = 1, 'éditeur actif : historique lisible');
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select tests.assert((select count(*) from public.cron_runs) = 0, 'éditeur inactif : rien de lisible');
reset role;
select tests.act_as(null);

select tests.assert((select relrowsecurity from pg_class where oid = 'public.cron_runs'::regclass), 'RLS activée sur cron_runs');
