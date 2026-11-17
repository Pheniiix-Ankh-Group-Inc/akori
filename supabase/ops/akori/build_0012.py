#!/usr/bin/env python3
"""Génère 05_apply_0012.sql pour le projet Supabase « akori ».

Usage : python3 -I supabase/ops/akori/build_0012.py
Les scripts 01 à 04 ont déjà été appliqués : ils ne sont pas régénérés ici.
Équivalent à `supabase db push` pour la seule migration 0012, avec contrôles
préalables et vérifications finales, dans une transaction unique.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
VERSION, NAME = "20261116001200", "bib_finalisation"

sql = (ROOT / "migrations" / f"{VERSION}_{NAME}.sql").read_text()
script = f"""-- =============================================================================
-- BIB — Application de la migration 0012 ({NAME})
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj) — à coller dans l'éditeur
-- SQL du tableau de bord. Transaction unique : en cas d'erreur, rien n'est
-- appliqué. Généré par supabase/ops/akori/build_0012.py (ne pas modifier à la main).
--
-- Effets : bucket bib-sob-snapshots privé, fin de la lecture anonyme des tables
-- de données State of BIB, empreinte de la source, journal de réconciliation,
-- thèmes d'actualité, verrou atomique des synchronisations Luma.
-- Aucune donnée n'est supprimée.
-- =============================================================================
begin;

do $$
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261115001100') then
    raise exception 'Migration 0011 absente : appliquer d''abord les migrations précédentes.';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version = '{VERSION}') then
    raise exception 'Migration 0012 déjà enregistrée : rien à faire.';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'kori%') then
    raise exception 'Objets KoriVenture présents : ce script ne s''applique qu''à la base BIB nettoyée.';
  end if;
  if (select count(*) from public.event_sync_runs where status = 'running') > 1 then
    raise exception 'Plusieurs synchronisations « running » : clore les exécutions interrompues avant d''appliquer le verrou.';
  end if;
end $$;

{sql}

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('{VERSION}', '{NAME}', array[]::text[]) on conflict (version) do nothing;

-- Vérifications finales (échec = annulation complète).
do $$
begin
  if exists (select 1 from storage.buckets where id like 'bib-sob-%' and public) then
    raise exception 'Un bucket State of BIB est encore public.';
  end if;
  if has_table_privilege('anon', 'public.dataset_versions', 'select')
     or has_table_privilege('anon', 'public.metric_observations', 'select')
     or has_table_privilege('anon', 'public.dataset_artifacts', 'select') then
    raise exception 'Lecture anonyme des données State of BIB encore possible.';
  end if;
  if to_regprocedure('public.begin_event_sync_run(text, uuid, integer)') is null then
    raise exception 'Fonction begin_event_sync_run absente.';
  end if;
  if (select count(*) from pg_tables where schemaname = 'public') <> 28 then
    raise exception 'Nombre de tables publiques inattendu (28 attendues).';
  end if;
end $$;

commit;

-- Après application : lancer les conseillers Supabase (sécurité, performance).
"""
(OUT / "05_apply_0012.sql").write_text(script)
print(f"écrit : {OUT / '05_apply_0012.sql'} ({len(script)} octets)")
