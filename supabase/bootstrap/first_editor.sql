-- ============================================================================
-- BIB — Initialisation du premier opérateur (procédure manuelle)
-- À exécuter UNE fois, par une personne habilitée, dans l'éditeur SQL du
-- projet Supabase BIB (staging d'abord), APRÈS :
--   1. avoir désactivé les inscriptions publiques (Auth > Sign In / Providers >
--      « Allow new users to sign up » = off) ;
--   2. avoir invité l'opérateur depuis Auth > Users > Invite user
--      (l'invitation crée la ligne auth.users).
-- Remplacer l'adresse ci-dessous. Ce fichier ne contient aucune donnée réelle.
-- ============================================================================

insert into public.editors (user_id, role, display_name)
select u.id, 'admin', null
from auth.users u
where lower(u.email) = lower('REMPLACER-PAR-L-ADRESSE-DE-L-OPERATEUR@example.org')
on conflict (user_id) do update set role = excluded.role, active = true;

-- Vérification
select e.user_id, u.email, e.role, e.active
from public.editors e join auth.users u on u.id = e.user_id;
