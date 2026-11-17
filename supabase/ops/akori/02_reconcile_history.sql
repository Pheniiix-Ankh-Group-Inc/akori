-- =============================================================================
-- BIB — Réconciliation de l'historique des migrations (métadonnées uniquement)
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj) — à coller dans l'éditeur
-- SQL du tableau de bord. Transaction unique : en cas d'erreur, rien n'est
-- appliqué. Généré par supabase/ops/akori/build.py (ne pas modifier à la main).
-- =============================================================================

-- Les migrations 0001–0005 ont été appliquées via l'outil MCP sous des
-- versions horodatées à l'application (20261114000151…). Ce script aligne
-- l'historique sur les fichiers GitHub, sans rejouer aucune migration :
-- les 5 lignes MCP sont remplacées par les versions des fichiers.
-- Équivalent CLI : supabase migration repair --status reverted <mcp> puis
--                  supabase migration repair --status applied <github>.
begin;
do $$ begin
  if (select count(*) from supabase_migrations.schema_migrations where version in ('20261114000151','20261114000209','20261114000242','20261114000318','20261114000355')) <> 5 then
    raise exception 'Historique inattendu : réconciliation refusée.';
  end if;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261112000100', 'core_admin', array[]::text[]) on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261112000200', 'events', array[]::text[]) on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261112000300', 'bib_en_action', array[]::text[]) on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261112000400', 'state_of_bib', array[]::text[]) on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261112000500', 'newsletter_ai', array[]::text[]) on conflict (version) do nothing;
delete from supabase_migrations.schema_migrations where version in ('20261114000151','20261114000209','20261114000242','20261114000318','20261114000355', '20261115012842');
commit;
