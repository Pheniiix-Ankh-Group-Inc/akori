#!/usr/bin/env python3
"""Génère 06_apply_0013.sql pour le projet Supabase « akori ».

Usage : python3 -I supabase/ops/akori/build_0013.py
Équivalent à `supabase db push` pour la seule migration 0013 (State of BIB
entièrement automatique), avec contrôles préalables et vérifications finales,
dans une transaction unique. Les scripts 01 à 05 ne sont pas régénérés.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
VERSION, NAME = "20261117001300", "sob_full_auto"

sql = (ROOT / "migrations" / f"{VERSION}_{NAME}.sql").read_text()
script = f"""-- =============================================================================
-- BIB — Application de la migration 0013 ({NAME})
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj) — à coller dans l'éditeur
-- SQL du tableau de bord. Transaction unique : en cas d'erreur, rien n'est
-- appliqué. Généré par supabase/ops/akori/build_0013.py (ne pas modifier à la main).
--
-- Effets : modes « sob » et « sob_insights » passés à AUTO (publication sans
-- approbation humaine), publication sûre en cas d'exécutions simultanées,
-- vérification après publication, suivi des tentatives. Aucune donnée supprimée.
-- Le mode « newsletter » n'est pas modifié.
-- =============================================================================
begin;

do $$
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261116001200') then
    raise exception 'Migration 0012 absente : appliquer d''abord les migrations précédentes.';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '{VERSION}') then
    raise exception 'Migration 0013 déjà enregistrée : rien à faire.';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'kori%') then
    raise exception 'Objets KoriVenture présents : ce script ne s''applique qu''à la base BIB.';
  end if;
end $$;

{sql}

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('{VERSION}', '{NAME}', array[]::text[]) on conflict (version) do nothing;

-- Vérifications finales (échec = annulation complète).
do $$
begin
  if (select count(*) from public.automation_settings where module in ('sob', 'sob_insights') and mode = 'auto') <> 2 then
    raise exception 'Les modes sob et sob_insights ne sont pas « auto ».';
  end if;
  if to_regprocedure('public.verify_current_dataset(text)') is null then
    raise exception 'Fonction verify_current_dataset absente.';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'dataset_versions' and column_name = 'attempts') then
    raise exception 'Colonne dataset_versions.attempts absente.';
  end if;
  if (select count(*) from pg_tables where schemaname = 'public') <> 28 then
    raise exception 'Nombre de tables publiques inattendu (28 attendues).';
  end if;
end $$;

commit;

-- Contrôle après application :
--   select module, mode from public.automation_settings order by module;
"""
(OUT / "06_apply_0013.sql").write_text(script)
print(f"écrit : {OUT / '06_apply_0013.sql'} ({len(script)} octets)")
