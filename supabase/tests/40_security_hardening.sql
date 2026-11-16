-- =============================================================================
-- Tests BIB : migration 0009 (vues SECURITY INVOKER, droits par colonne).
-- S'exécute après 10_security_and_integrity.sql (mêmes données fictives).
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- Valeurs attendues calculées avec les droits complets.
create temporary table expected as
select
  (select count(*) from public.media_assets where public_path is not null and rights_status = 'approved') as media_pub,
  (select count(*) from public.media_assets) as media_all,
  (select count(*) from public.testimonials where status = 'published') as testi_pub;
grant select on expected to anon, authenticated;

select tests.assert(
  (select bool_and(coalesce(reloptions, '{}') @> array['security_invoker=true'])
   from pg_class where oid in ('public.media_public'::regclass, 'public.testimonials_public'::regclass)),
  '0009 : vues publiques en security_invoker');

-- Visiteur anonyme
set role anon;
select tests.act_as(null);
select tests.assert(tests.visible($$select * from public.media_public$$) = (select media_pub from expected),
  'anon : media_public = médias publiables uniquement');
select tests.assert(tests.try($$select rights_reference from public.media_assets$$) = '42501',
  'anon : référence de droits illisible');
select tests.assert(tests.try($$select draft_path from public.media_assets$$) = '42501',
  'anon : chemin brouillon illisible');
select tests.assert(tests.try($$select consent_proof_path from public.media_assets$$) = '42501',
  'anon : preuve de consentement média illisible');
select tests.assert(tests.visible($$select id from public.media_assets where rights_status <> 'approved'$$) = 0,
  'anon : aucun média non approuvé visible');
select tests.assert(tests.visible($$select * from public.testimonials_public$$) = (select testi_pub from expected),
  'anon : testimonials_public = témoignages publiés uniquement');
select tests.assert(tests.try($$select consent_reference from public.testimonials$$) = '42501',
  'anon : référence de consentement illisible');
select tests.assert(tests.visible($$select id from public.testimonials where status <> 'published'$$) = 0,
  'anon : aucun témoignage non publié visible');
reset role;

-- Compte Auth sans habilitation : aucun accès éditorial.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000f');
select tests.assert(tests.visible($$select * from public.media_assets$$) = 0,
  'utilisateur non éditeur : media_assets invisible');
select tests.assert(tests.visible($$select * from public.testimonials where status <> 'published'$$) = 0,
  'utilisateur non éditeur : brouillons de témoignages invisibles');
select tests.assert(tests.visible($$select * from public.editors$$) <= 0,
  'utilisateur non éditeur : liste des éditeurs invisible');
select tests.assert(public.current_editor_role() is null,
  'utilisateur non éditeur : aucun rôle BIB');
reset role;

-- Éditeur actif : accès complet.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select tests.assert(tests.visible($$select * from public.media_assets$$) = (select media_all from expected),
  'éditeur : tous les médias visibles');
select tests.assert(tests.visible($$select * from public.media_public$$) = (select media_pub from expected),
  'éditeur : media_public cohérente');
reset role;
select tests.act_as(null);

\echo 'Tests de durcissement 0009 passés.'
