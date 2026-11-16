-- =============================================================================
-- Inventaire LECTURE SEULE d'un projet Supabase existant (ex. « akori »).
-- Aucune écriture. Exécuter avec un rôle de lecture, résultat à archiver avec
-- la date dans le dossier de migration (hors dépôt si données personnelles).
-- Usage : psql "$DB_URL" -f supabase/ops/10_inventory_readonly.sql > inventaire_$(date +%F).txt
-- =============================================================================
\pset pager off
begin read only;

\echo '== Identité du projet'
select current_database() as database, current_setting('server_version') as postgres, now() as inventoried_at;

\echo '== Tables (public) avec RLS et estimation de lignes'
select c.relname as table_name, c.relrowsecurity as rls, c.reltuples::bigint as approx_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1;

\echo '== Vues'
select table_schema, table_name from information_schema.views where table_schema not in ('pg_catalog', 'information_schema') order by 1, 2;

\echo '== Fonctions (public, private) : sécurité, search_path, droits'
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer,
       p.proconfig as config, pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') order by 1, 2;

\echo '== Triggers'
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers where trigger_schema = 'public' order by 2, 3;

\echo '== Politiques RLS'
select schemaname, tablename, policyname, roles, cmd from pg_policies order by 1, 2, 3;

\echo '== Index'
select tablename, indexname from pg_indexes where schemaname = 'public' order by 1, 2;

\echo '== Types'
select t.typname, t.typtype from pg_type t join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype in ('e', 'c', 'd') order by 1;

\echo '== Dépendances entre tables (clés étrangères)'
select conrelid::regclass as from_table, confrelid::regclass as to_table, conname, confdeltype as on_delete
from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace order by 1, 2;

\echo '== Storage : buckets et volume (sans contenu)'
select b.id, b.public, count(o.id) as objects, pg_size_pretty(coalesce(sum((o.metadata->>'size')::bigint), 0)) as size
from storage.buckets b left join storage.objects o on o.bucket_id = b.id group by 1, 2 order by 1;

\echo '== Auth : comptes (agrégats uniquement, aucune adresse)'
select count(*) as users, count(*) filter (where last_sign_in_at > now() - interval '90 days') as active_90d,
       min(created_at) as oldest, max(created_at) as newest from auth.users;

\echo '== Historique des migrations'
select version, name from supabase_migrations.schema_migrations order by version;

rollback;
