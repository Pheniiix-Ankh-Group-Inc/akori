#!/usr/bin/env python3
"""Reconstruit une réplique SQL d'un projet Supabase à partir d'un export
logique (catalogue + données) produit par supabase/ops/export_catalog.sql.

Usage :
  python3 -I supabase/ops/build_replica.py <dossier_export> > replica.sql
  python3 -I supabase/ops/build_replica.py <dossier_export> --legacy-rollback > rollback.sql
    (script de retour arrière du nettoyage 0010 : recrée UNIQUEMENT les objets
     KoriVenture supprimés — tables, données, fonctions kori_*, politiques
     Storage historiques — sans toucher aux objets BIB ni au système)
  psql "$PGURL_JETABLE" -v ON_ERROR_STOP=1 -f supabase/tests/00_supabase_stub.sql
  psql "$PGURL_JETABLE" -v ON_ERROR_STOP=1 -f replica.sql

Le dossier d'export contient :
  catalog_tables.json  (types, tables, colonnes, contraintes, index, vues)
  catalog_code.json    (fonctions, déclencheurs, politiques, buckets, objets)
  data_public.json     (lignes de chaque table public)

Sert à deux choses : prouver qu'une sauvegarde se restaure, et tester des
migrations sur une copie fidèle d'un projet existant. NE JAMAIS exécuter le
SQL produit sur un projet Supabase : il recrée des objets existants.
L'export contient des données personnelles : il ne doit pas être versionné.
"""
import json
import sys
from pathlib import Path


def q(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def lit(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


ACL_PRIVS = {"a": "INSERT", "r": "SELECT", "w": "UPDATE", "d": "DELETE", "D": "TRUNCATE", "x": "REFERENCES", "t": "TRIGGER", "m": "MAINTAIN"}
ROLES = {"anon", "authenticated", "service_role"}


def grants(obj: str, acl: list[str] | None, kind: str = "table") -> list[str]:
    out = [f"revoke all on {kind} {obj} from public, anon, authenticated, service_role;"]
    for item in acl or []:
        grantee, rest = item.split("=", 1)
        privs = rest.split("/", 1)[0]
        if grantee not in ROLES:
            continue
        if kind == "function":
            if "X" in privs:
                out.append(f"grant execute on function {obj} to {grantee};")
            continue
        names = [ACL_PRIVS[c] for c in privs if c in ACL_PRIVS and c != "m"]
        if names:
            out.append(f"grant {', '.join(names)} on {obj} to {grantee};")
    return out


BIB_TABLES = {
    "editors", "editorial_audit", "rate_limit_hits", "events", "event_translations", "media_assets", "stories",
    "story_translations", "story_media", "testimonials", "data_sources", "dataset_versions", "ingestion_runs",
    "metric_definitions", "metric_observations", "dataset_artifacts", "news_sources", "news_items", "ai_runs",
    "newsletter_cycles", "newsletter_editions", "edition_checks", "send_runs", "ops_incidents",
    "newsletter_consents", "sob_insights",
}


def legacy_only(tables: dict, code: dict, data: dict) -> tuple[dict, dict, dict]:
    """Restreint l'export aux objets retirés par la migration 0010."""
    t = dict(tables)
    t["enums"] = []
    t["views"] = []
    t["tables"] = [x for x in tables["tables"] if x["schema"] == "public" and x["name"] not in BIB_TABLES]
    names = {x["name"] for x in t["tables"]}
    t["sequences"] = [s for s in tables.get("sequences") or [] if s.split(".", 1)[1].rsplit("_", 2)[0] in names]
    c = dict(code)
    c["functions"] = [f for f in code.get("functions") or [] if f["sig"].startswith("public.kori_")]
    c["triggers"] = [g for g in code.get("triggers") or [] if any(f" ON public.{n} " in g for n in names)]
    c["policies"] = [
        p for p in code.get("policies") or []
        if (p["schema"] == "public" and p["table"] in names) or (p["schema"] == "storage" and not p["name"].startswith("bib_"))
    ]
    c["buckets"] = []
    c["objects"] = []
    d = {k: v for k, v in data.items() if k in names}
    return t, c, d


def main(folder: Path, rollback: bool = False) -> None:
    tables = json.loads((folder / "catalog_tables.json").read_text())
    code = json.loads((folder / "catalog_code.json").read_text())
    data = json.loads((folder / "data_public.json").read_text())
    if rollback:
        tables, code, data = legacy_only(tables, code, data)
    out: list[str] = [
        "-- Réplique générée par supabase/ops/build_replica.py — base JETABLE uniquement.",
        "set check_function_bodies = off;",
        "create schema if not exists private;",
        "grant usage on schema private to anon, authenticated, service_role;",
        "create extension if not exists pgcrypto;",
        'create extension if not exists "uuid-ossp";',
        # Compléments au stub Supabase (colonnes et fonction utilisées par les objets répliqués).
        "alter table storage.buckets add column if not exists created_at timestamptz default now();",
        "alter table storage.buckets add column if not exists updated_at timestamptz default now();",
        "alter table storage.objects add column if not exists metadata jsonb;",
        "alter table storage.objects add column if not exists updated_at timestamptz default now();",
        "create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;",
        "grant execute on function storage.foldername(text) to anon, authenticated, service_role;",
    ]
    if rollback:
        # Restauration sur le projet réel : aucun complément au système Supabase.
        out = ["-- Retour arrière du nettoyage 0010 (objets KoriVenture uniquement).", "begin;", "set check_function_bodies = off;"]
    for e in tables.get("enums") or []:
        labels = ", ".join(lit(x) for x in e["labels"])
        out.append(f"create type {q(e['schema'])}.{q(e['name'])} as enum ({labels});")
    for s in tables.get("sequences") or []:
        sch, name = s.split(".", 1)
        out.append(f"create sequence if not exists {q(sch)}.{q(name)};")

    fks: list[str] = []
    after: list[str] = []
    for t in tables["tables"]:
        full = f"{q(t['schema'])}.{q(t['name'])}"
        cols = []
        for c in t["cols"]:
            line = f"  {q(c['n'])} {c['t']}"
            if c.get("g") == "s" and c.get("d"):
                line += f" generated always as ({c['d']}) stored"
            elif c.get("id") in ("a", "d"):
                line += " generated " + ("always" if c["id"] == "a" else "by default") + " as identity"
            elif c.get("d"):
                line += f" default {c['d']}"
            if c.get("nn"):
                line += " not null"
            cols.append(line)
        out.append(f"create table {full} (\n" + ",\n".join(cols) + "\n);")
        for con in t.get("cons") or []:
            stmt = f"alter table {full} add constraint {q(con['n'])} {con['d']};"
            (fks if con["t"] == "f" else out).append(stmt)
        for idx in t.get("idx") or []:
            after.append(idx + ";")
        if t.get("rls"):
            after.append(f"alter table {full} enable row level security;")
        if t.get("force"):
            after.append(f"alter table {full} force row level security;")
        after.extend(grants(full, t.get("acl")))
    out.extend(fks)
    out.extend(after)

    for s in tables.get("sequences") or []:
        sch, name = s.split(".", 1)
        out.append(f"grant usage, select, update on sequence {q(sch)}.{q(name)} to anon, authenticated, service_role;")

    for f in code.get("functions") or []:
        out.append(f["def"].rstrip() + ";")
        sch_name, args = f["sig"].split("(", 1)
        sch, name = sch_name.split(".", 1)
        out.extend(grants(f"{q(sch)}.{q(name)}({args}", f.get("acl"), "function"))

    for v in tables.get("views") or []:
        opts = f" with ({', '.join(v['opts'])})" if v.get("opts") else ""
        full = f"{q(v['schema'])}.{q(v['name'])}"
        out.append(f"create view {full}{opts} as {v['def'].rstrip().rstrip(';')};")
        out.extend(grants(full, v.get("acl")))

    for trg in code.get("triggers") or []:
        out.append(trg + ";")

    for p in code.get("policies") or []:
        full = f"{q(p['schema'])}.{q(p['table'])}"
        roles = p["roles"]
        roles = roles if isinstance(roles, list) else roles.strip("{}").split(",")
        stmt = f"create policy {q(p['name'])} on {full} as {p['permissive'].lower()} for {p['cmd'].lower()} to {', '.join(roles)}"
        if p.get("qual"):
            stmt += f" using ({p['qual']})"
        if p.get("check"):
            stmt += f" with check ({p['check']})"
        out.append(stmt + ";")

    # Données : déclencheurs et contraintes différés pendant le chargement.
    out.append("set session_replication_role = replica;")
    for b in code.get("buckets") or []:
        out.append(
            "insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values "
            f"({lit(b['id'])}, {lit(b['name'])}, {str(bool(b.get('public'))).lower()}, "
            f"{b['file_size_limit'] if b.get('file_size_limit') is not None else 'null'}, "
            f"{lit('{' + ','.join(b['allowed_mime_types']) + '}') + '::text[]' if b.get('allowed_mime_types') else 'null'});"
        )
    for o in code.get("objects") or []:
        meta = json.dumps({"size": o.get("size"), "mimetype": o.get("mimetype")})
        out.append(f"insert into storage.objects (bucket_id, name, metadata) values ({lit(o['bucket'])}, {lit(o['name'])}, {lit(meta)}::jsonb);")

    user_ids: set[str] = set()
    for rows in ([] if rollback else data.values()):
        for r in rows:
            for k, v in r.items():
                if isinstance(v, str) and len(v) == 36 and v.count("-") == 4 and k.endswith(("user_id", "_by", "id")):
                    user_ids.add(v)
    # Seuls les identifiants réellement présents comme profils ou auteurs sont nécessaires ;
    # on insère des comptes techniques sans adresse (aucune donnée personnelle).
    for uid in sorted(user_ids):
        out.append(f"insert into auth.users (id) values ({lit(uid)}) on conflict do nothing;")
    for name, rows in data.items():
        if not rows:
            continue
        payload = lit(json.dumps(rows, ensure_ascii=False))
        out.append(f"insert into public.{q(name)} select * from json_populate_recordset(null::public.{q(name)}, {payload}::json);")
    for s in tables.get("sequences") or []:
        sch, name = s.split(".", 1)
        tbl = name.rsplit("_", 2)[0]
        col = name.rsplit("_", 2)[1]
        out.append(
            f"select setval({lit(sch + '.' + name)}, coalesce((select max({q(col)}) from {q(sch)}.{q(tbl)}), 0) + 1, false);"
        )
    out.append("set session_replication_role = origin;")
    if rollback:
        out.append("commit;")
    print("\n".join(out))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    main(Path(args[0]), rollback="--legacy-rollback" in sys.argv)
