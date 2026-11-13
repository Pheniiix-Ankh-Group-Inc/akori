-- =============================================================================
-- BIB — Contrôle préalable OBLIGATOIRE avant d'appliquer les migrations BIB
-- sur un projet Supabase existant (en particulier « akori », qui contient un
-- ancien schéma métier).
-- LECTURE SEULE. Lève une exception si un objet BIB porte déjà le même nom :
-- « create table if not exists » ignorerait silencieusement la table existante
-- et les politiques/contraintes BIB s'appliqueraient à une structure étrangère.
-- Usage : psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/00_preflight_bib.sql
-- =============================================================================
do $$
declare
  v_tables text[] := array['editors','editorial_audit','rate_limit_hits','events','event_translations','media_assets',
    'stories','story_translations','story_media','testimonials','data_sources','dataset_versions','ingestion_runs',
    'metric_definitions','metric_observations','dataset_artifacts','news_sources','news_items','ai_runs',
    'newsletter_cycles','newsletter_editions','edition_checks','send_runs','ops_incidents','newsletter_consents','sob_insights'];
  v_types text[] := array['editor_role','publication_status','event_mode','media_kind','rights_status',
    'dataset_version_status','run_status','newsletter_theme','newsletter_rubric','cycle_status','edition_status'];
  v_functions text[] := array['consume_rate_limit','current_editor_role','media_storage_report','newsletter_validate_pair',
    'promote_dataset_version','publish_dataset_version','replace_story_media','rollback_dataset_version','save_event',
    'save_story','transition_event','transition_story'];
  v_views text[] := array['media_public','testimonials_public'];
  v_buckets text[] := array['bib-media-drafts','bib-media-public','bib-consents','bib-sob-snapshots','bib-sob-candidates'];
  v_conflicts text[] := '{}';
  v_applied boolean;
begin
  -- Migrations BIB déjà appliquées ? (historique Supabase CLI)
  select exists (select 1 from information_schema.tables where table_schema = 'supabase_migrations' and table_name = 'schema_migrations')
    into v_applied;
  if v_applied then
    execute $q$select exists (select 1 from supabase_migrations.schema_migrations where version like '2026111%')$q$ into v_applied;
  end if;

  select v_conflicts || coalesce(array_agg('table public.' || c.relname), '{}') into v_conflicts
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f') and c.relname = any (v_tables || v_views);

  select v_conflicts || coalesce(array_agg('type public.' || t.typname), '{}') into v_conflicts
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname = any (v_types);

  select v_conflicts || coalesce(array_agg(distinct 'function public.' || p.proname), '{}') into v_conflicts
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any (v_functions);

  if exists (select 1 from information_schema.schemata where schema_name = 'private') then
    v_conflicts := v_conflicts || array['schema private (existe déjà : vérifier son contenu)'];
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    execute $q$select coalesce(array_agg('bucket ' || id), '{}') from storage.buckets where id = any ($1)$q$
      into strict v_tables using v_buckets;
    v_conflicts := v_conflicts || v_tables;
  end if;

  if v_applied then
    raise notice 'Des migrations BIB semblent déjà appliquées : ne pas rejouer, comparer avec supabase migration list.';
  end if;
  if cardinality(v_conflicts) > 0 then
    raise exception 'Préflight BIB : % conflit(s) de noms — ARRÊT. %', cardinality(v_conflicts), array_to_string(v_conflicts, ', ');
  end if;
  raise notice 'Préflight BIB : aucun conflit de nom détecté.';
end $$;
