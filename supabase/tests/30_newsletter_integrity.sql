-- =============================================================================
-- Tests BIB : intégrité newsletter (paire atomique, immutabilité, envois).
-- Base jetable uniquement.
-- =============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into public.newsletter_cycles (id, week_start, send_slot, status)
values ('30000000-0000-0000-0000-000000000001', '2026-11-16', '2026-11-18T14:00:00Z', 'checking');
insert into public.newsletter_editions (id, cycle_id, locale, version, status, subject, content, html) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'fr', 1, 'draft', 'Sujet v1', '{}', '<p>v1</p>'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'en', 1, 'draft', 'Subject v1', '{}', '<p>v1</p>'),
  ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'fr', 2, 'draft', 'Sujet v2', '{}', '<p>v2</p>'),
  ('31000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'en', 2, 'draft', 'Subject v2', '{}', '<p>v2</p>');

set role service_role;
select tests.assert(tests.try($$select public.newsletter_validate_pair('30000000-0000-0000-0000-000000000001',
  array['31000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000004']::uuid[])$$) = 'BIB04',
  'paire de versions différentes refusée');
select tests.assert((select count(*) from public.newsletter_editions where status = 'cancelled') = 0,
  'refus : aucune édition annulée (transaction annulée)');
select public.newsletter_validate_pair('30000000-0000-0000-0000-000000000001',
  array['31000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000004']::uuid[]);
reset role;
select tests.assert((select array_agg(version || ':' || status order by version, locale) from public.newsletter_editions)
  = array['1:cancelled', '1:cancelled', '2:validated', '2:validated'], 'validation atomique : v2 validée, v1 annulée');

select tests.assert(tests.try($$update public.newsletter_editions set html = '<p>modifié</p>' where id = '31000000-0000-0000-0000-000000000003'$$) = 'BIB04',
  'édition validée : contenu immuable');
update public.newsletter_editions set status = 'sent' where id = '31000000-0000-0000-0000-000000000003';
select tests.assert(tests.try($$update public.newsletter_editions set status = 'cancelled' where id = '31000000-0000-0000-0000-000000000003'$$) = 'BIB04',
  'édition envoyée : statut définitif');

insert into public.send_runs (cycle_id, edition_id, locale, idempotency_key, status, brevo_campaign_id)
values ('30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000003', 'fr', '2026-11-16:fr', 'sent', 42);
select tests.assert(tests.try($$update public.send_runs set status = 'failed' where idempotency_key = '2026-11-16:fr'$$) = 'BIB04',
  'envoi confirmé : non modifiable');
select tests.assert(tests.try($$insert into public.send_runs (cycle_id, edition_id, locale, idempotency_key) values
  ('30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000003', 'fr', '2026-11-16:fr')$$) = '23505',
  'clé d''idempotence : double envoi impossible');

-- Consentements : états de demande
insert into public.newsletter_consents (email_sha256, locale, consent_text_version, status)
values (repeat('d', 64), 'fr', 'test', 'pending');
select tests.assert(tests.try($$insert into public.newsletter_consents (email_sha256, locale, consent_text_version, status)
  values (repeat('d', 64), 'fr', 'test', 'confirmed')$$) = '23514', 'consentement : état inconnu refusé');

set role service_role;
select tests.assert(tests.try($$select public.newsletter_validate_pair('30000000-0000-0000-0000-000000000001', array[]::uuid[])$$) = '22023',
  'paire vide refusée');
reset role;
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select tests.assert(tests.try($$select public.newsletter_validate_pair('30000000-0000-0000-0000-000000000001',
  array['31000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000004']::uuid[])$$) = '42501',
  'validation de paire réservée au service');
reset role;

\echo 'Tests newsletter passés.'
