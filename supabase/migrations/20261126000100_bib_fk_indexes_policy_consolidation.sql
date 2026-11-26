-- =============================================================================
-- BIB — Migration 0016 : index de clés étrangères et consolidation RLS
-- -----------------------------------------------------------------------------
-- 1. Couvre les 3 clés étrangères signalées par l'advisor (unindexed_foreign_keys).
-- 2. Supprime l'avertissement multiple_permissive_policies sur 5 tables SANS
--    changer les droits : pour chaque table, le SELECT du rôle authenticated est
--    porté par une seule policy (éditeur OU publié), anon garde la lecture des
--    seuls contenus publiés, et les écritures éditeur restent identiques
--    (INSERT/UPDATE/DELETE au lieu de ALL, mêmes prédicats).
-- Droits avant = droits après, vérifié par supabase/tests/96_policy_consolidation.sql.
-- Transactionnelle (exécutée en bloc) ; aucune donnée modifiée.
-- =============================================================================

-- 1. Index de clés étrangères --------------------------------------------------
create index if not exists automation_settings_updated_by_fk_idx
  on public.automation_settings (updated_by);
create index if not exists dataset_version_deltas_previous_version_id_fk_idx
  on public.dataset_version_deltas (previous_version_id);
create index if not exists dataset_version_deltas_metric_key_fk_idx
  on public.dataset_version_deltas (metric_key);

-- 2. events : events_editor_read + events_public_read ---------------------------
drop policy if exists events_editor_read on public.events;
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon
  using (status = 'published'::public.publication_status);
create policy events_read on public.events
  for select to authenticated
  using ((select private.is_editor()) or status = 'published'::public.publication_status);

-- 3. stories ------------------------------------------------------------------
drop policy if exists stories_editor_all on public.stories;
drop policy if exists stories_public_read on public.stories;
create policy stories_public_read on public.stories
  for select to anon
  using (status = 'published'::public.publication_status);
create policy stories_read on public.stories
  for select to authenticated
  using ((select private.is_editor()) or status = 'published'::public.publication_status);
create policy stories_editor_insert on public.stories
  for insert to authenticated with check ((select private.is_editor()));
create policy stories_editor_update on public.stories
  for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
create policy stories_editor_delete on public.stories
  for delete to authenticated using ((select private.is_editor()));

-- 4. Tables filles (traductions, médias) --------------------------------------
-- Même schéma : lecture anon si le parent est publié ; lecture authenticated si
-- éditeur ou parent publié ; écritures réservées aux éditeurs.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('event_translations', 'events',  'event_id'),
      ('story_translations', 'stories', 'story_id'),
      ('story_media',        'stories', 'story_id')
    ) as t(tbl, parent, fk)
  loop
    execute format('drop policy if exists %I on public.%I', r.tbl || '_editor_all', r.tbl);
    execute format('drop policy if exists %I on public.%I', r.tbl || '_public_read', r.tbl);
    execute format(
      'create policy %I on public.%I for select to anon using (exists (select 1 from public.%I p where p.id = %I.%I and p.status = %L::public.publication_status))',
      r.tbl || '_public_read', r.tbl, r.parent, r.tbl, r.fk, 'published');
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_editor()) or exists (select 1 from public.%I p where p.id = %I.%I and p.status = %L::public.publication_status))',
      r.tbl || '_read', r.tbl, r.parent, r.tbl, r.fk, 'published');
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_editor()))',
      r.tbl || '_editor_insert', r.tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_editor())) with check ((select private.is_editor()))',
      r.tbl || '_editor_update', r.tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_editor()))',
      r.tbl || '_editor_delete', r.tbl);
  end loop;
end
$$;
