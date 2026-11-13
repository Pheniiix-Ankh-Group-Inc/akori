-- =============================================================================
-- MODÈLE — Nettoyage de l'ancien schéma du projet « akori ». NE PAS EXÉCUTER
-- tel quel. Ce fichier est volontairement BLOQUÉ (exception en tête).
--
-- Prérequis, tous obligatoires (docs/SUPABASE_MIGRATION_PLAN.md) :
--   1. inventaire 10_inventory_readonly.sql archivé et revu ;
--   2. sauvegarde complète (pg_dump + objets Storage) ET restauration testée
--      sur un projet jetable ;
--   3. accord écrit du propriétaire, liste exacte des objets à supprimer ;
--   4. fenêtre de maintenance ; aucune dépendance BIB vers ces objets.
-- Procédure : copier ce fichier hors du dépôt, compléter les listes, retirer
-- la garde, exécuter dans une transaction, vérifier, puis COMMIT manuel.
-- =============================================================================
do $$ begin
  raise exception 'Modèle bloqué : compléter la liste des objets et obtenir l''accord explicite avant toute exécution.';
end $$;

begin;
-- Exemple de structure (aucun nom réel ici) :
-- drop policy if exists "<politique>" on public."<table_ancienne>";
-- drop table if exists public."<table_ancienne>" restrict;   -- RESTRICT : échoue si une dépendance existe
-- drop function if exists public."<fonction_ancienne>"(<args>) restrict;
-- Buckets Storage : vider puis supprimer via l'API Storage (pas en SQL direct),
-- après export des objets : profile-photos, startup-data-room.
-- Comptes Auth hérités : ne jamais les supprimer ici ; aucun n'obtient de rôle
-- BIB tant qu'il n'est pas inscrit explicitement dans public.editors.
-- Vérifications avant COMMIT :
-- select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r';
rollback; -- remplacer par COMMIT uniquement après vérification humaine
