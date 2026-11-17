-- =============================================================================
-- BIB — Migration 0010 : retrait des structures historiques KoriVenture
-- -----------------------------------------------------------------------------
-- DESTRUCTIVE. À n'appliquer qu'après :
--   1. sauvegarde vérifiée du schéma et des données (export logique + test de
--      restauration, voir docs/SUPABASE_MIGRATION_PLAN.md §Nettoyage) ;
--   2. export des fichiers du bucket profile-photos ;
--   3. approbation explicite de la liste ci-dessous par le propriétaire.
-- Liste EXPLICITE (aucun CASCADE) : si un objet non listé dépend d'un objet
-- listé, l'instruction échoue et rien n'est supprimé (transaction unique).
-- Idempotente : relancée après succès, elle ne fait rien.
-- ISOLÉE du dossier supabase/migrations : jamais appliquée par `supabase db push`.
-- Hors périmètre SQL (étapes manuelles, voir le plan) :
--   * buckets profile-photos et startup-data-room : Supabase interdit la
--     suppression SQL des objets Storage (storage.protect_delete) ; suppression
--     depuis le tableau de bord après export ;
--   * comptes Auth historiques : décision compte par compte.
-- Conservé : schémas système, extensions, 26 tables BIB et leurs données,
-- fonctions private.* et BIB, buckets bib-*.
-- =============================================================================

-- Garde-fous : bon projet (26 tables BIB présentes) et aucune dépendance BIB.
do $$
declare
  v_bib text[] := array[
    'editors',
    'editorial_audit',
    'rate_limit_hits',
    'events',
    'event_translations',
    'media_assets',
    'stories',
    'story_translations',
    'story_media',
    'testimonials',
    'data_sources',
    'dataset_versions',
    'ingestion_runs',
    'metric_definitions',
    'metric_observations',
    'dataset_artifacts',
    'news_sources',
    'news_items',
    'ai_runs',
    'newsletter_cycles',
    'newsletter_editions',
    'edition_checks',
    'send_runs',
    'ops_incidents',
    'newsletter_consents',
    'sob_insights'];
  v_kori text[] := array[
    'agreement_acceptances',
    'capital_releases',
    'communities',
    'community_memberships',
    'deal_closing_checklist_items',
    'deal_milestones',
    'deals',
    'diligence_discussion_messages',
    'diligence_evidence',
    'diligence_evidence_items',
    'diligence_evidence_requests',
    'diligence_recommendations',
    'diligence_request_messages',
    'diligence_reviews',
    'diligence_risks',
    'diligence_room_invites',
    'diligence_room_members',
    'diligence_rooms',
    'diligence_workstreams',
    'founder_profiles',
    'investor_profiles',
    'multisig_signers',
    'onboarding_progress',
    'profiles',
    'spvs',
    'startup_documents',
    'startups',
    'waiting_list_form',
    'wallet_transactions',
    'wallets'];
  v_missing text[];
  v_deps text[];
begin
  select array_agg(t) into v_missing
  from unnest(v_bib) t
  where to_regclass('public.' || t) is null;
  if v_missing is not null then
    raise exception 'Nettoyage refusé : tables BIB absentes (%). Mauvais projet ?', v_missing;
  end if;

  -- Clés étrangères d'une table NON listée vers une table listée.
  select array_agg(distinct c.conrelid::regclass::text) into v_deps
  from pg_constraint c
  where c.contype = 'f'
    and c.confrelid in (select to_regclass('public.' || t) from unnest(v_kori) t where to_regclass('public.' || t) is not null)
    and c.conrelid not in (select to_regclass('public.' || t) from unnest(v_kori) t where to_regclass('public.' || t) is not null);
  if v_deps is not null then
    raise exception 'Nettoyage refusé : objets non listés dépendant de KoriVenture : %', v_deps;
  end if;
end $$;

-- 1. Politiques Storage des buckets historiques.
drop policy if exists "founders delete own data room" on storage.objects;
drop policy if exists "founders read own data room" on storage.objects;
drop policy if exists "founders update own data room" on storage.objects;
drop policy if exists "founders upload own data room" on storage.objects;
drop policy if exists "profile photos are readable" on storage.objects;
drop policy if exists "users delete own profile photo" on storage.objects;
drop policy if exists "users update own profile photo" on storage.objects;
drop policy if exists "users upload own profile photo" on storage.objects;

-- 2. Tables (30). Une seule instruction : l'ordre des dépendances internes est
--    résolu par PostgreSQL ; leurs politiques, index, contraintes, déclencheurs
--    et séquences possédées disparaissent avec elles.
drop table if exists
  public.agreement_acceptances,
  public.capital_releases,
  public.communities,
  public.community_memberships,
  public.deal_closing_checklist_items,
  public.deal_milestones,
  public.deals,
  public.diligence_discussion_messages,
  public.diligence_evidence,
  public.diligence_evidence_items,
  public.diligence_evidence_requests,
  public.diligence_recommendations,
  public.diligence_request_messages,
  public.diligence_reviews,
  public.diligence_risks,
  public.diligence_room_invites,
  public.diligence_room_members,
  public.diligence_rooms,
  public.diligence_workstreams,
  public.founder_profiles,
  public.investor_profiles,
  public.multisig_signers,
  public.onboarding_progress,
  public.profiles,
  public.spvs,
  public.startup_documents,
  public.startups,
  public.waiting_list_form,
  public.wallet_transactions,
  public.wallets;

-- 3. Fonctions kori_* (21), désormais sans usage.
drop function if exists public.kori_can_founder_access_diligence_request(p_request_id uuid);
drop function if exists public.kori_can_founder_attach_startup_document(p_request_id uuid, p_document_id uuid);
drop function if exists public.kori_can_founder_read_diligence_profile(p_profile_id uuid);
drop function if exists public.kori_can_read_diligence_community(p_community_id uuid);
drop function if exists public.kori_can_read_diligence_deal(p_deal_id uuid);
drop function if exists public.kori_can_read_diligence_profile(p_profile_id uuid);
drop function if exists public.kori_can_read_diligence_spv(p_spv_id uuid);
drop function if exists public.kori_can_read_diligence_startup(p_startup_id uuid);
drop function if exists public.kori_diligence_set_updated_at();
drop function if exists public.kori_founder_diligence_milestone_count(p_deal_id uuid);
drop function if exists public.kori_is_active_diligence_member(p_room_id uuid);
drop function if exists public.kori_is_active_investor_diligence_member_for_deal(p_deal_id uuid);
drop function if exists public.kori_is_diligence_lead_reviewer(p_room_id uuid);
drop function if exists public.kori_is_diligence_room_creator(p_room_id uuid);
drop function if exists public.kori_is_founder_for_diligence_deal(p_deal_id uuid);
drop function if exists public.kori_is_founder_for_diligence_room(p_room_id uuid);
drop function if exists public.kori_is_founder_for_diligence_spv(p_spv_id uuid);
drop function if exists public.kori_is_investor();
drop function if exists public.kori_is_lead_investor_for_deal(p_deal_id uuid);
drop function if exists public.kori_is_lead_reviewer_for_diligence_deal(p_deal_id uuid);
drop function if exists public.kori_sync_diligence_request_status_from_message();

-- 4. Séquence historique éventuellement restée orpheline.
drop sequence if exists public.waiting_list_form_id_seq;

-- Contrôle final : plus aucune table listée, toutes les tables BIB présentes.
do $$
declare v_left text[];
begin
  select array_agg(c.relname) into v_left from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and c.relname = any (array['agreement_acceptances','capital_releases','communities','community_memberships',
      'deal_closing_checklist_items','deal_milestones','deals','diligence_discussion_messages','diligence_evidence',
      'diligence_evidence_items','diligence_evidence_requests','diligence_recommendations','diligence_request_messages',
      'diligence_reviews','diligence_risks','diligence_room_invites','diligence_room_members','diligence_rooms',
      'diligence_workstreams','founder_profiles','investor_profiles','multisig_signers','onboarding_progress','profiles',
      'spvs','startup_documents','startups','waiting_list_form','wallet_transactions','wallets']);
  if v_left is not null then
    raise exception 'Contrôle final : tables historiques encore présentes : %', v_left;
  end if;
  if (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
      and relname in ('editors','events','media_assets','stories','dataset_versions','newsletter_cycles')) <> 6 then
    raise exception 'Contrôle final : tables BIB manquantes';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname like 'kori\_%') then
    raise exception 'Contrôle final : fonctions kori_* encore présentes';
  end if;
end $$;
