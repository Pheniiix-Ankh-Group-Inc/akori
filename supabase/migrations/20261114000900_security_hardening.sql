-- =============================================================================
-- BIB — Migration 0009 : durcissement sécurité et performance (alertes Supabase)
-- -----------------------------------------------------------------------------
-- Additive et réversible. Indépendante du nettoyage KoriVenture (0010).
--  1. Vues publiques media_public / testimonials_public en SECURITY INVOKER
--     (alerte « security_definer_view ») : le filtrage public repose désormais
--     sur la RLS de la table + des droits COLONNE PAR COLONNE pour anon. Le rôle
--     anon ne peut lire que les colonnes non sensibles des lignes publiables
--     (jamais rights_reference, chemins privés ni preuves de consentement).
--  2. GraphQL : l'application n'utilise que PostgREST ; pg_graphql est retiré
--     pour ne plus exposer le schéma (alertes « pg_graphql_*_table_exposed »).
--     Retour arrière : create extension pg_graphql;
--  3. Index couvrant chaque clé étrangère BIB (alerte « unindexed_foreign_keys »).
-- current_editor_role() reste exécutable par authenticated : elle ne renvoie
-- que le rôle de l'appelant (auth.uid()) et sert au contrôle d'accès serveur.
-- =============================================================================

-- 1a. media_assets : lecture publique restreinte (anon uniquement).
revoke select on public.media_assets from anon;
grant select (id, kind, public_path, mime_type, width, height, duration_seconds, alt_text, credit,
              poster_media_id, subtitles_media_id, rights_status)
  on public.media_assets to anon;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets' and policyname = 'media_public_anon_read') then
    create policy media_public_anon_read on public.media_assets
      for select to anon
      using (public_path is not null and rights_status = 'approved');
  end if;
end $$;

alter view public.media_public set (security_invoker = true);

-- 1b. testimonials : seuls les témoignages publiés, sans preuve de consentement.
revoke select on public.testimonials from anon;
grant select (id, story_id, event_id, status, locale, quote, author_name, author_role, position, published_at)
  on public.testimonials to anon;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'testimonials' and policyname = 'testimonials_public_anon_read') then
    create policy testimonials_public_anon_read on public.testimonials
      for select to anon
      using (status = 'published');
  end if;
end $$;

alter view public.testimonials_public set (security_invoker = true);

-- 2. GraphQL non utilisé.
drop extension if exists pg_graphql;

-- 3. Index des clés étrangères BIB.
create index if not exists edition_checks_edition_id_fk_idx on public.edition_checks (edition_id);
create index if not exists editorial_audit_actor_id_fk_idx on public.editorial_audit (actor_id);
create index if not exists editors_created_by_fk_idx on public.editors (created_by);
create index if not exists events_cover_media_id_fk_idx on public.events (cover_media_id);
create index if not exists events_created_by_fk_idx on public.events (created_by);
create index if not exists events_updated_by_fk_idx on public.events (updated_by);
create index if not exists ingestion_runs_dataset_version_id_fk_idx on public.ingestion_runs (dataset_version_id);
create index if not exists media_assets_created_by_fk_idx on public.media_assets (created_by);
create index if not exists media_assets_poster_media_id_fk_idx on public.media_assets (poster_media_id);
create index if not exists media_assets_subtitles_media_id_fk_idx on public.media_assets (subtitles_media_id);
create index if not exists news_items_source_id_fk_idx on public.news_items (source_id);
create index if not exists newsletter_editions_ai_run_id_fk_idx on public.newsletter_editions (ai_run_id);
create index if not exists ops_incidents_cycle_id_fk_idx on public.ops_incidents (cycle_id);
create index if not exists send_runs_cycle_id_fk_idx on public.send_runs (cycle_id);
create index if not exists send_runs_edition_id_fk_idx on public.send_runs (edition_id);
create index if not exists sob_insights_ai_run_id_fk_idx on public.sob_insights (ai_run_id);
create index if not exists sob_insights_approved_by_fk_idx on public.sob_insights (approved_by);
create index if not exists sob_insights_dataset_version_id_fk_idx on public.sob_insights (dataset_version_id);
create index if not exists stories_cover_media_id_fk_idx on public.stories (cover_media_id);
create index if not exists stories_created_by_fk_idx on public.stories (created_by);
create index if not exists stories_featured_video_id_fk_idx on public.stories (featured_video_id);
create index if not exists stories_updated_by_fk_idx on public.stories (updated_by);
create index if not exists story_media_media_id_fk_idx on public.story_media (media_id);
create index if not exists testimonials_created_by_fk_idx on public.testimonials (created_by);
create index if not exists testimonials_event_id_fk_idx on public.testimonials (event_id);
create index if not exists testimonials_story_id_fk_idx on public.testimonials (story_id);
