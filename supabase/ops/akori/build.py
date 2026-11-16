#!/usr/bin/env python3
"""Régénère les scripts SQL d'application pour le projet Supabase « akori ».

Usage : python3 -I supabase/ops/akori/build.py
Produit, à partir de supabase/migrations/ :
  01_apply_0006_0011.sql   migrations 0006–0009 (non destructives) + historique
  02_reconcile_history.sql alignement de l'historique 0001–0005 sur GitHub
  03_cleanup_koriventure.sql migration 0010 (destructive, après approbation)
Chaque script est une transaction unique, avec contrôles préalables.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIG = ROOT / "migrations"
OUT = Path(__file__).resolve().parent

MCP_VERSIONS = ["20261114000151", "20261114000209", "20261114000242", "20261114000318", "20261114000355"]
# Entrée créée le 15/11/2026 par un essai d'écriture (3 index de 0009, sans effet
# sur les données) : retirée de l'historique, 0009 étant enregistrée en entier.
MCP_EXTRA = ["20261115012842"]
GITHUB_INITIAL = [
    ("20261112000100", "core_admin"),
    ("20261112000200", "events"),
    ("20261112000300", "bib_en_action"),
    ("20261112000400", "state_of_bib"),
    ("20261112000500", "newsletter_ai"),
]
APPLY = [
    ("20261113000600", "editorial_integrity"),
    ("20261113000700", "sob_governance"),
    ("20261113000800", "newsletter_integrity"),
    ("20261114000900", "security_hardening"),
    ("20261115001100", "bib_v2_automation"),
]
CLEANUP = ("20261114001000", "legacy_koriventure_cleanup")


def header(title: str) -> str:
    return f"""-- =============================================================================
-- {title}
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj) — à coller dans l'éditeur
-- SQL du tableau de bord. Transaction unique : en cas d'erreur, rien n'est
-- appliqué. Généré par supabase/ops/akori/build.py (ne pas modifier à la main).
-- =============================================================================
"""


def history(version: str, name: str) -> str:
    return (
        "insert into supabase_migrations.schema_migrations (version, name, statements) "
        f"values ('{version}', '{name}', array[]::text[]) on conflict (version) do nothing;"
    )


def migration(version: str, name: str) -> str:
    path = MIG / f"{version}_{name}.sql"
    if not path.exists():
        # Migrations destructives isolées du flux automatique (supabase db push).
        path = OUT / "sql" / f"{version}_{name}.sql"
    return path.read_text()


def build() -> None:
    pre = """
-- Contrôles préalables (lecture seule).
do $$ begin
  if to_regclass('public.editors') is null or to_regclass('public.newsletter_editions') is null then
    raise exception 'Migrations 0001–0005 absentes : script refusé.';
  end if;
  if to_regprocedure('private.assert_editor()') is not null then
    raise exception '0006 déjà appliquée : script refusé (ne jamais rejouer une migration).';
  end if;
end $$;
"""
    parts = [header("BIB — Application des migrations 0006, 0007, 0008, 0009 et 0011 (non destructives)"), "begin;", pre]
    for version, name in APPLY:
        parts += [f"\n-- >>> {version}_{name}.sql\n", migration(version, name), history(version, name)]
    parts.append("\ncommit;\n")
    (OUT / "01_apply_0006_0011.sql").write_text("\n".join(parts))

    quoted = ",".join(f"'{v}'" for v in MCP_VERSIONS)
    rec = [
        header("BIB — Réconciliation de l'historique des migrations (métadonnées uniquement)"),
        """-- Les migrations 0001–0005 ont été appliquées via l'outil MCP sous des
-- versions horodatées à l'application (20261114000151…). Ce script aligne
-- l'historique sur les fichiers GitHub, sans rejouer aucune migration :
-- les 5 lignes MCP sont remplacées par les versions des fichiers.
-- Équivalent CLI : supabase migration repair --status reverted <mcp> puis
--                  supabase migration repair --status applied <github>.""",
        "begin;",
        f"""do $$ begin
  if (select count(*) from supabase_migrations.schema_migrations where version in ({quoted})) <> 5 then
    raise exception 'Historique inattendu : réconciliation refusée.';
  end if;
end $$;""",
    ]
    rec += [history(v, n) for v, n in GITHUB_INITIAL]
    extra = ",".join(f"'{v}'" for v in MCP_EXTRA)
    rec.append(f"delete from supabase_migrations.schema_migrations where version in ({quoted}, {extra});")
    rec.append("commit;\n")
    (OUT / "02_reconcile_history.sql").write_text("\n".join(rec))

    cl = [
        header("BIB — Nettoyage KoriVenture (DESTRUCTIF — uniquement après approbation écrite)"),
        "begin;",
        migration(*CLEANUP),
        history(*CLEANUP),
        "commit;\n",
    ]
    (OUT / "03_cleanup_koriventure.sql").write_text("\n".join(cl))


if __name__ == "__main__":
    build()
