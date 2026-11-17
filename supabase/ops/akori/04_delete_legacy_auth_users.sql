-- =============================================================================
-- BIB — Suppression des 9 comptes Auth hérités de KoriVenture (DESTRUCTIF)
-- Approuvée par le propriétaire le 14/11/2026 (« supprimer les 9 »).
-- À exécuter APRÈS 03_cleanup_koriventure.sql, dans l'éditeur SQL Supabase.
-- Transaction unique. Refus si un de ces comptes est habilité BIB (editors)
-- ou si la liste ne correspond plus exactement aux comptes présents.
-- Les identités et sessions liées (auth.identities, auth.sessions, …) sont
-- supprimées en cascade par Supabase Auth.
-- =============================================================================
begin;

do $$
declare
  v_ids uuid[] := array[
    '445e8b15-a4f6-4be3-aa3d-782dc014cd69', '0bc45a9f-cad5-45a5-accd-2d7b8423a873',
    '04774b47-ac77-4f54-a2d2-130b686a3a0e', '2fb40c6d-df45-4ee3-9d42-b140add64885',
    '960f3093-dc1f-406f-89ef-672868f7146b', 'ead89d77-6d65-4807-aaa3-14be0ac91b41',
    '59f9d67a-2da1-4b97-97b7-9465de77cbdf', 'b79fbe53-4c20-4a80-b93d-24419c96a834',
    '9b1ffc59-08b0-4c4f-accb-7e22af38d792']::uuid[];
  v_found int;
begin
  if to_regclass('public.profiles') is not null then
    raise exception 'Exécuter d''abord 03_cleanup_koriventure.sql.';
  end if;
  if exists (select 1 from public.editors where user_id = any (v_ids)) then
    raise exception 'Un compte de la liste est habilité BIB : suppression refusée.';
  end if;
  select count(*) into v_found from auth.users where id = any (v_ids);
  if v_found = 0 then
    raise notice 'Comptes déjà supprimés : rien à faire.';
    return;
  end if;
  if v_found <> 9 or (select count(*) from auth.users) <> 9 then
    raise exception 'Liste inattendue (% trouvés sur 9, % comptes au total) : suppression refusée.', v_found, (select count(*) from auth.users);
  end if;
  delete from auth.users where id = any (v_ids);
end $$;

select count(*) as comptes_auth_restants from auth.users;

commit;
