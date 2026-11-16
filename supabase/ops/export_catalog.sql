-- =============================================================================
-- Export logique en LECTURE SEULE d'un projet Supabase (catalogue + données),
-- consommé par supabase/ops/build_replica.py. Trois requêtes ; enregistrer le
-- champ « j » de chacune dans catalog_tables.json, catalog_code.json et
-- data_public.json. Le résultat contient des données personnelles : à
-- conserver hors dépôt, dans un emplacement chiffré.
-- =============================================================================

-- 1. catalog_tables.json
with rels as (select c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.reloptions, c.relacl
              from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname in ('public', 'private') and c.relkind in ('r', 'v', 'S'))
select json_build_object(
 'enums', (select json_agg(json_build_object('schema', n.nspname, 'name', t.typname,
            'labels', (select json_agg(enumlabel order by enumsortorder) from pg_enum e where e.enumtypid = t.oid)) order by t.typname)
           from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname in ('public', 'private') and t.typtype = 'e'),
 'sequences', (select json_agg(nspname || '.' || relname) from rels where relkind = 'S'),
 'tables', (select json_agg(json_build_object('schema', r.nspname, 'name', r.relname, 'rls', r.relrowsecurity, 'force', r.relforcerowsecurity, 'acl', r.relacl::text[],
    'cols', (select json_agg(json_build_object('n', a.attname, 't', format_type(a.atttypid, a.atttypmod), 'nn', a.attnotnull,
             'd', pg_get_expr(ad.adbin, ad.adrelid), 'id', a.attidentity, 'g', a.attgenerated) order by a.attnum)
             from pg_attribute a left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
             where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped),
    'cons', (select json_agg(json_build_object('n', conname, 't', contype, 'd', pg_get_constraintdef(oid)) order by contype, conname)
             from pg_constraint where conrelid = r.oid),
    'idx', (select json_agg(pg_get_indexdef(i.indexrelid)) from pg_index i
            where i.indrelid = r.oid and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid))
   ) order by r.relname) from rels r where relkind = 'r'),
 'views', (select json_agg(json_build_object('schema', nspname, 'name', relname, 'opts', reloptions, 'acl', relacl::text[], 'def', pg_get_viewdef(oid)))
           from rels where relkind = 'v')
) j;

-- 2. catalog_code.json
select json_build_object(
 'functions', (select json_agg(json_build_object('sig', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
               'def', pg_get_functiondef(p.oid), 'acl', p.proacl::text[]) order by n.nspname, p.proname)
               from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private') and p.prokind in ('f', 'p')),
 'triggers', (select json_agg(pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid = t.tgrelid
              join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname = 'public'),
 'policies', (select json_agg(json_build_object('schema', schemaname, 'table', tablename, 'name', policyname, 'permissive', permissive,
              'roles', roles, 'cmd', cmd, 'qual', qual, 'check', with_check)) from pg_policies where schemaname in ('public', 'storage')),
 'buckets', (select json_agg(to_jsonb(b)) from storage.buckets b),
 'objects', (select json_agg(json_build_object('bucket', bucket_id, 'name', name, 'size', metadata->>'size',
             'mimetype', metadata->>'mimetype', 'created', created_at)) from storage.objects),
 'schema_acl', (select json_agg(json_build_object('n', nspname, 'acl', nspacl::text[])) from pg_namespace where nspname in ('public', 'private'))
) j;

-- 3. data_public.json
select json_object_agg(t, (xpath('/row/j/text()', query_to_xml(
         'select coalesce(json_agg(x), ''[]'') j from public.' || quote_ident(t) || ' x', false, true, '')))[1]::text::json) j
from (select c.relname t from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r') s;
