-- ============================================================================
-- BIB — Initialisation du PREMIER administrateur (procédure manuelle, unique)
-- À exécuter par le propriétaire du projet dans l'éditeur SQL Supabase,
-- APRÈS :
--   1. inscriptions publiques désactivées (Auth > Sign In / Providers >
--      « Allow new users to sign up » = off) ;
--   2. invitation de la personne approuvée (Auth > Users > Invite user) : cela
--      crée sa ligne auth.users ;
--   3. approbation écrite de l'identité de ce premier administrateur.
-- Remplacer UNIQUEMENT l'adresse de la ligne v_email. Transaction unique.
-- Refus si : adresse non remplacée, compte inexistant ou multiple, ou si un
-- administrateur actif existe déjà (les suivants s'ajoutent depuis /admin ou
-- par une décision explicite, jamais par ce script).
-- ============================================================================
begin;

do $$
declare
  v_email text := 'REMPLACER-PAR-L-ADRESSE-APPROUVEE@example.org';
  v_user uuid;
  v_count int;
begin
  if v_email like 'REMPLACER-%' or v_email like '%@example.org' then
    raise exception 'Adresse non renseignée : remplacer v_email par l''adresse approuvée.';
  end if;
  if exists (select 1 from public.editors where role = 'admin' and active) then
    raise exception 'Un administrateur actif existe déjà : bootstrap refusé.';
  end if;
  select count(*), min(u.id::text)::uuid into v_count, v_user
  from auth.users u where lower(u.email) = lower(v_email);
  if v_count <> 1 then
    raise exception 'Compte Auth introuvable ou ambigu pour cette adresse (% trouvé). Inviter d''abord la personne.', v_count;
  end if;

  insert into public.editors (user_id, role, display_name, active)
  values (v_user, 'admin', null, true)
  on conflict (user_id) do update set role = 'admin', active = true;

  insert into public.editorial_audit (actor_id, action, entity_type, entity_id, details)
  values (null, 'editor.bootstrap_admin', 'editor', v_user, jsonb_build_object('method', 'sql_bootstrap'));
end $$;

-- Vérification : exactement un administrateur actif.
select e.user_id, u.email, e.role, e.active
from public.editors e join auth.users u on u.id = e.user_id;

commit;
