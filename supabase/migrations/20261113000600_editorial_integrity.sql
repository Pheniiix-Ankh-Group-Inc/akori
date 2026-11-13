-- =============================================================================
-- BIB — Migration corrective 0006 : intégrité des opérations éditoriales
-- -----------------------------------------------------------------------------
-- Additive et réversible (aucune table supprimée, aucune donnée modifiée).
-- Objet :
--   * enregistrer une fiche (événement, rétrospective) et ses traductions en
--     UNE transaction, avec contrôle de modification concurrente ;
--   * remplacer la galerie d'une rétrospective sans perte en cas d'échec ;
--   * transitions de statut conditionnelles, idempotentes, journalisées dans
--     la même transaction ;
--   * refus en base de toute publication dont un média n'est pas diffusable ;
--   * rapport de réconciliation media_assets ↔ Storage (lecture seule) ;
--   * durcissement des politiques Storage (WITH CHECK, chemins).
--
-- Les fonctions éditoriales sont SECURITY INVOKER : la RLS existante
-- s'applique, et un contrôle explicite private.is_editor() est ajouté.
-- Codes d'erreur applicatifs (SQLSTATE) :
--   BIB01 conflit de modification     BIB02 introuvable
--   BIB03 média non diffusable        BIB04 transition interdite
--   BIB05 contenu incomplet           42501 non autorisé
-- Le nombre de tables BIB reste inchangé (26).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Garde d'autorisation commune
-- ---------------------------------------------------------------------------
create or replace function private.assert_editor()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.is_editor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end $$;

revoke all on function private.assert_editor() from public;
grant execute on function private.assert_editor() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Média diffusable : droits approuvés, référence, copie publique présente,
-- texte alternatif pour les images/affiches, compagnons (affiche, sous-titres)
-- eux-mêmes diffusables.
-- ---------------------------------------------------------------------------
create or replace function private.media_is_publishable(p_media_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(bool_and(
           m.rights_status = 'approved'
           and m.rights_reference is not null
           and m.public_path is not null
           and (m.kind not in ('image', 'poster')
                or exists (select 1 from jsonb_each_text(m.alt_text) a where length(btrim(a.value)) > 0))
         ), false)
  from public.media_assets m
  where m.id = p_media_id
     or m.id = (select x.poster_media_id from public.media_assets x where x.id = p_media_id)
     or m.id = (select x.subtitles_media_id from public.media_assets x where x.id = p_media_id)
$$;

revoke all on function private.media_is_publishable(uuid) from public;
grant execute on function private.media_is_publishable(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Événements : enregistrement atomique (fiche + traductions)
-- p_event : objet JSON des colonnes éditables ; p_translations : tableau
-- [{locale,title,summary,description}] — les langues absentes ou sans titre
-- sont supprimées. p_expected_updated_at : valeur lue à l'ouverture du
-- formulaire (NULL = pas de contrôle, création).
-- ---------------------------------------------------------------------------
create or replace function public.save_event(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_event jsonb,
  p_translations jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_uid uuid := auth.uid();
  v_status public.publication_status;
  v_locales text[];
begin
  perform private.assert_editor();
  if jsonb_typeof(p_translations) is distinct from 'array' then
    raise exception 'translations must be an array' using errcode = '22023';
  end if;
  if not exists (select 1 from jsonb_array_elements(p_translations) t where length(btrim(coalesce(t->>'title', ''))) > 0) then
    raise exception 'a title is required in at least one locale' using errcode = 'BIB05';
  end if;

  if v_id is null then
    insert into public.events (slug, time_zone, starts_at, ends_at, mode, venue_name, address, city,
                               country_code, online_url, luma_url, cover_media_id, status, created_by, updated_by)
    values (p_event->>'slug', coalesce(p_event->>'time_zone', 'America/Toronto'),
            (p_event->>'starts_at')::timestamptz, (p_event->>'ends_at')::timestamptz,
            coalesce(p_event->>'mode', 'in_person')::public.event_mode,
            p_event->>'venue_name', p_event->>'address', p_event->>'city', p_event->>'country_code',
            p_event->>'online_url', p_event->>'luma_url', (p_event->>'cover_media_id')::uuid,
            'draft', v_uid, v_uid)
    returning id, status into v_id, v_status;
  else
    update public.events e set
      slug = p_event->>'slug',
      time_zone = coalesce(p_event->>'time_zone', 'America/Toronto'),
      starts_at = (p_event->>'starts_at')::timestamptz,
      ends_at = (p_event->>'ends_at')::timestamptz,
      mode = coalesce(p_event->>'mode', 'in_person')::public.event_mode,
      venue_name = p_event->>'venue_name',
      address = p_event->>'address',
      city = p_event->>'city',
      country_code = p_event->>'country_code',
      online_url = p_event->>'online_url',
      luma_url = p_event->>'luma_url',
      cover_media_id = (p_event->>'cover_media_id')::uuid,
      updated_by = v_uid
    where e.id = v_id
      and (p_expected_updated_at is null or e.updated_at = p_expected_updated_at)
    returning e.status into v_status;
    if not found then
      if exists (select 1 from public.events where id = v_id) then
        raise exception 'concurrent modification' using errcode = 'BIB01';
      end if;
      raise exception 'event not found' using errcode = 'BIB02';
    end if;
  end if;

  -- Une fiche publiée ne peut pas recevoir un visuel non diffusable.
  if v_status = 'published' and (p_event->>'cover_media_id') is not null
     and not private.media_is_publishable((p_event->>'cover_media_id')::uuid) then
    raise exception 'cover media is not publishable' using errcode = 'BIB03';
  end if;

  select coalesce(array_agg(t->>'locale'), '{}') into v_locales
  from jsonb_array_elements(p_translations) t
  where length(btrim(coalesce(t->>'title', ''))) > 0;

  insert into public.event_translations (event_id, locale, title, summary, description)
  select v_id, t->>'locale', btrim(t->>'title'), nullif(t->>'summary', ''), nullif(t->>'description', '')
  from jsonb_array_elements(p_translations) t
  where length(btrim(coalesce(t->>'title', ''))) > 0
  on conflict (event_id, locale) do update
    set title = excluded.title, summary = excluded.summary, description = excluded.description;

  delete from public.event_translations where event_id = v_id and not (locale = any (v_locales));

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id)
  values (v_uid, case when p_id is null then 'event.create' else 'event.update' end, 'event', v_id);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Rétrospectives : enregistrement atomique (fiche + traductions)
-- ---------------------------------------------------------------------------
create or replace function public.save_story(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_story jsonb,
  p_translations jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_uid uuid := auth.uid();
  v_status public.publication_status;
  v_locales text[];
  v_media uuid;
begin
  perform private.assert_editor();
  if jsonb_typeof(p_translations) is distinct from 'array' then
    raise exception 'translations must be an array' using errcode = '22023';
  end if;
  if not exists (select 1 from jsonb_array_elements(p_translations) t where length(btrim(coalesce(t->>'title', ''))) > 0) then
    raise exception 'a title is required in at least one locale' using errcode = 'BIB05';
  end if;

  if v_id is null then
    insert into public.stories (slug, occurred_on, event_id, cover_media_id, featured_video_id, status, created_by, updated_by)
    values (p_story->>'slug', (p_story->>'occurred_on')::date, (p_story->>'event_id')::uuid,
            (p_story->>'cover_media_id')::uuid, (p_story->>'featured_video_id')::uuid, 'draft', v_uid, v_uid)
    returning id, status into v_id, v_status;
  else
    update public.stories s set
      slug = p_story->>'slug',
      occurred_on = (p_story->>'occurred_on')::date,
      event_id = (p_story->>'event_id')::uuid,
      cover_media_id = (p_story->>'cover_media_id')::uuid,
      featured_video_id = (p_story->>'featured_video_id')::uuid,
      updated_by = v_uid
    where s.id = v_id
      and (p_expected_updated_at is null or s.updated_at = p_expected_updated_at)
    returning s.status into v_status;
    if not found then
      if exists (select 1 from public.stories where id = v_id) then
        raise exception 'concurrent modification' using errcode = 'BIB01';
      end if;
      raise exception 'story not found' using errcode = 'BIB02';
    end if;
  end if;

  if v_status = 'published' then
    foreach v_media in array array_remove(array[(p_story->>'cover_media_id')::uuid, (p_story->>'featured_video_id')::uuid], null) loop
      if not private.media_is_publishable(v_media) then
        raise exception 'media % is not publishable', v_media using errcode = 'BIB03';
      end if;
    end loop;
  end if;

  select coalesce(array_agg(t->>'locale'), '{}') into v_locales
  from jsonb_array_elements(p_translations) t
  where length(btrim(coalesce(t->>'title', ''))) > 0;

  insert into public.story_translations (story_id, locale, title, summary, body, seo_description)
  select v_id, t->>'locale', btrim(t->>'title'), nullif(t->>'summary', ''), nullif(t->>'body', ''), nullif(t->>'seo_description', '')
  from jsonb_array_elements(p_translations) t
  where length(btrim(coalesce(t->>'title', ''))) > 0
  on conflict (story_id, locale) do update
    set title = excluded.title, summary = excluded.summary, body = excluded.body, seo_description = excluded.seo_description;

  delete from public.story_translations where story_id = v_id and not (locale = any (v_locales));

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id)
  values (v_uid, case when p_id is null then 'story.create' else 'story.update' end, 'story', v_id);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Galerie d'une rétrospective : remplacement atomique.
-- p_items : [{media_id, position, caption}]. Renvoie les médias retirés de la
-- galerie (candidats au retrait de leur copie publique, traité ensuite).
-- En cas d'échec, l'ancienne galerie est intacte (rollback complet).
-- ---------------------------------------------------------------------------
create or replace function public.replace_story_media(
  p_story_id uuid,
  p_items jsonb
) returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.publication_status;
  v_removed uuid[];
  v_media uuid;
begin
  perform private.assert_editor();
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'items must be an array' using errcode = '22023';
  end if;

  -- Verrou de ligne : sérialise les modifications concurrentes de la galerie.
  select s.status into v_status from public.stories s where s.id = p_story_id for update;
  if not found then
    raise exception 'story not found' using errcode = 'BIB02';
  end if;

  if v_status = 'published' then
    for v_media in select (i->>'media_id')::uuid from jsonb_array_elements(p_items) i loop
      if not private.media_is_publishable(v_media) then
        raise exception 'media % is not publishable', v_media using errcode = 'BIB03';
      end if;
    end loop;
  end if;

  select coalesce(array_agg(sm.media_id), '{}') into v_removed
  from public.story_media sm
  where sm.story_id = p_story_id
    and sm.media_id not in (select (i->>'media_id')::uuid from jsonb_array_elements(p_items) i);

  delete from public.story_media where story_id = p_story_id and media_id = any (v_removed);

  insert into public.story_media (story_id, media_id, position, caption)
  select p_story_id, (i->>'media_id')::uuid, (i->>'position')::integer, coalesce(i->'caption', '{}'::jsonb)
  from jsonb_array_elements(p_items) i
  on conflict (story_id, media_id) do update set position = excluded.position, caption = excluded.caption;

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'story.media_update', 'story', p_story_id,
          jsonb_build_object('count', jsonb_array_length(p_items), 'removed', cardinality(v_removed)));
  return v_removed;
end $$;

-- ---------------------------------------------------------------------------
-- Transitions de statut (événements, rétrospectives)
-- p_transition : 'publish' | 'unpublish' | 'archive'.
-- Idempotent : republier un contenu publié (double clic) ne fait rien et
-- renvoie 'noop'. Toute autre transition non prévue lève BIB04.
-- La publication exige un titre et des médias tous diffusables (la copie
-- publique Storage est faite AVANT par l'application ; voir docs).
-- ---------------------------------------------------------------------------
create or replace function public.transition_event(p_id uuid, p_transition text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.publication_status;
  v_cover uuid;
  v_target public.publication_status;
begin
  perform private.assert_editor();
  select e.status, e.cover_media_id into v_status, v_cover from public.events e where e.id = p_id for update;
  if not found then
    raise exception 'event not found' using errcode = 'BIB02';
  end if;

  v_target := case p_transition when 'publish' then 'published' when 'unpublish' then 'draft' when 'archive' then 'archived' end;
  if v_target is null then
    raise exception 'unknown transition %', p_transition using errcode = 'BIB04';
  end if;
  if v_status = v_target then
    return 'noop';
  end if;
  if p_transition in ('unpublish') and v_status <> 'published' then
    raise exception 'transition % not allowed from %', p_transition, v_status using errcode = 'BIB04';
  end if;

  if p_transition = 'publish' then
    if not exists (select 1 from public.event_translations t where t.event_id = p_id) then
      raise exception 'no title' using errcode = 'BIB05';
    end if;
    if v_cover is not null and not private.media_is_publishable(v_cover) then
      raise exception 'cover media is not publishable' using errcode = 'BIB03';
    end if;
    update public.events set status = 'published', published_at = now(), archived_at = null, updated_by = auth.uid() where id = p_id;
  elsif p_transition = 'archive' then
    update public.events set status = 'archived', archived_at = now(), updated_by = auth.uid() where id = p_id;
  else
    update public.events set status = 'draft', updated_by = auth.uid() where id = p_id;
  end if;

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'event.' || p_transition, 'event', p_id, jsonb_build_object('from', v_status));
  return v_target::text;
end $$;

create or replace function public.transition_story(p_id uuid, p_transition text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.publication_status;
  v_target public.publication_status;
  v_media uuid;
begin
  perform private.assert_editor();
  select s.status into v_status from public.stories s where s.id = p_id for update;
  if not found then
    raise exception 'story not found' using errcode = 'BIB02';
  end if;

  v_target := case p_transition when 'publish' then 'published' when 'unpublish' then 'draft' when 'archive' then 'archived' end;
  if v_target is null then
    raise exception 'unknown transition %', p_transition using errcode = 'BIB04';
  end if;
  if v_status = v_target then
    return 'noop';
  end if;
  if p_transition = 'unpublish' and v_status <> 'published' then
    raise exception 'transition % not allowed from %', p_transition, v_status using errcode = 'BIB04';
  end if;

  if p_transition = 'publish' then
    if not exists (select 1 from public.story_translations t where t.story_id = p_id) then
      raise exception 'no title' using errcode = 'BIB05';
    end if;
    for v_media in
      select x from (
        select s.cover_media_id as x from public.stories s where s.id = p_id
        union select s.featured_video_id from public.stories s where s.id = p_id
        union select sm.media_id from public.story_media sm where sm.story_id = p_id
      ) q where x is not null
    loop
      if not private.media_is_publishable(v_media) then
        raise exception 'media % is not publishable', v_media using errcode = 'BIB03';
      end if;
    end loop;
    update public.stories set status = 'published', published_at = now(), archived_at = null, updated_by = auth.uid() where id = p_id;
  elsif p_transition = 'archive' then
    update public.stories set status = 'archived', archived_at = now(), updated_by = auth.uid() where id = p_id;
  else
    update public.stories set status = 'draft', updated_by = auth.uid() where id = p_id;
  end if;

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'story.' || p_transition, 'story', p_id, jsonb_build_object('from', v_status));
  return v_target::text;
end $$;

revoke all on function public.save_event(uuid, timestamptz, jsonb, jsonb) from public, anon;
revoke all on function public.save_story(uuid, timestamptz, jsonb, jsonb) from public, anon;
revoke all on function public.replace_story_media(uuid, jsonb) from public, anon;
revoke all on function public.transition_event(uuid, text) from public, anon;
revoke all on function public.transition_story(uuid, text) from public, anon;
grant execute on function public.save_event(uuid, timestamptz, jsonb, jsonb) to authenticated;
grant execute on function public.save_story(uuid, timestamptz, jsonb, jsonb) to authenticated;
grant execute on function public.replace_story_media(uuid, jsonb) to authenticated;
grant execute on function public.transition_event(uuid, text) to authenticated;
grant execute on function public.transition_story(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Garde-fou en base : un média ne peut pas perdre ses droits tout en gardant
-- une copie publique (la contrainte existante l'impose déjà) ; on interdit en
-- plus de supprimer un média encore référencé par un contenu publié.
-- ---------------------------------------------------------------------------
create or replace function private.prevent_published_media_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.events e where e.status = 'published' and e.cover_media_id = old.id)
     or exists (select 1 from public.stories s where s.status = 'published' and (s.cover_media_id = old.id or s.featured_video_id = old.id))
     or exists (select 1 from public.story_media sm join public.stories s on s.id = sm.story_id where s.status = 'published' and sm.media_id = old.id) then
    raise exception 'media % is used by published content', old.id using errcode = 'BIB03';
  end if;
  return old;
end $$;

drop trigger if exists media_assets_prevent_published_delete on public.media_assets;
create trigger media_assets_prevent_published_delete
  before delete on public.media_assets
  for each row execute function private.prevent_published_media_delete();

-- ---------------------------------------------------------------------------
-- Réconciliation media_assets ↔ Storage (LECTURE SEULE, aucune suppression).
-- Réservée au service applicatif (clé secrète).
-- ---------------------------------------------------------------------------
create or replace function public.media_storage_report()
returns table (issue text, media_id uuid, bucket text, object_path text)
language sql
stable
security definer
set search_path = ''
as $$
  -- Fiche dont le fichier privé est absent.
  select 'draft_object_missing', m.id, 'bib-media-drafts', m.draft_path
  from public.media_assets m
  where not exists (select 1 from storage.objects o where o.bucket_id = 'bib-media-drafts' and o.name = m.draft_path)
  union all
  -- Fiche « publiée » dont la copie publique est absente.
  select 'public_object_missing', m.id, 'bib-media-public', m.public_path
  from public.media_assets m
  where m.public_path is not null
    and not exists (select 1 from storage.objects o where o.bucket_id = 'bib-media-public' and o.name = m.public_path)
  union all
  -- Copie publique sans fiche correspondante (orpheline, à retirer à la main).
  select 'public_object_orphan', null, 'bib-media-public', o.name
  from storage.objects o
  where o.bucket_id = 'bib-media-public'
    and not exists (select 1 from public.media_assets m where m.public_path = o.name)
  union all
  -- Fichier privé sans fiche (import interrompu).
  select 'draft_object_orphan', null, 'bib-media-drafts', o.name
  from storage.objects o
  where o.bucket_id = 'bib-media-drafts'
    and not exists (select 1 from public.media_assets m where m.draft_path = o.name)
  union all
  -- Copie publique dont les droits ne sont plus approuvés (ne devrait pas exister).
  select 'public_without_rights', m.id, 'bib-media-public', m.public_path
  from public.media_assets m
  where m.public_path is not null and m.rights_status <> 'approved'
$$;

revoke all on function public.media_storage_report() from public, anon, authenticated;
grant execute on function public.media_storage_report() to service_role;

-- ---------------------------------------------------------------------------
-- Storage : WITH CHECK sur la mise à jour (empêche de déplacer un objet vers
-- un autre bucket) et chemins attendus.
-- ---------------------------------------------------------------------------
drop policy if exists bib_drafts_editor_update on storage.objects;
create policy bib_drafts_editor_update on storage.objects
  for update to authenticated
  using (bucket_id in ('bib-media-drafts', 'bib-consents') and (select private.is_editor()))
  with check (bucket_id in ('bib-media-drafts', 'bib-consents') and (select private.is_editor()));

drop policy if exists bib_drafts_editor_insert on storage.objects;
create policy bib_drafts_editor_insert on storage.objects
  for insert to authenticated
  with check (
    (select private.is_editor())
    and (
      -- Chemins produits par createUploadTicket / createConsentTicket.
      (bucket_id = 'bib-media-drafts' and name ~ '^uploads/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}\.(jpg|png|webp|avif|mp4|vtt)$')
      or (bucket_id = 'bib-consents' and name ~ '^media/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$')
    )
  );
