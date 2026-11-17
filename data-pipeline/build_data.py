"""build_data.py — State of Black in Blockchain · data pipeline.

Reads Electric Capital's open developer dataset (Parquet snapshots on
Cloudflare R2) directly over HTTPS via DuckDB, aggregates to the strict
Africa + Caribbean scope, and writes six JSON files for the editorial
dashboard on anbachain.org.

Nothing large ever lands on disk. DuckDB's httpfs extension reads only
the row groups and columns each query touches, so a 5 GB parquet costs
tens of MB for a country-level rollup.

Outputs in ./data/:
    meta.json          — dataset version, block number, generated_at, scope note
    headline.json      — 4 hero stats (devs, ecosystems, countries, cities)
    country_map.json   — per-country active devs + commits for the choropleth
    top_cities.json    — top ~12 cities by active developers
    ecosystem_mix.json — top ecosystems by AFR+CARIB devs, indexed monthly
    tenure_cohort.json — 0–1y / 1–2y / 2y+ stack over time

Run:
    pip install -r requirements.txt
    python build_data.py
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import requests

from validate import consistency_anomalies, validate_output_dir
from history import archive_current
from country_scope import (
    SCOPE_ISO_A3,
    REGION_BY_ISO,
    resolve_iso_a3,
    country_name,
)

from paths import DATA_DIR as OUTPUT_DIR
from source_manifest import ManifestError, fetch_manifest, fingerprint, table_resources, verify_resources, version_of

ETH_RPC = "https://cloudflare-eth.com"

from source_manifest import SOB_TABLES as TABLES  # noqa: E402


# ── 1. Snapshot resolution ────────────────────────────────────────────



def get_eth_block() -> int | None:
    """Fetch the latest Ethereum mainnet block. Used for the on-chain
    signature in the page footer; not required for data correctness."""
    try:
        r = requests.post(
            ETH_RPC,
            json={"jsonrpc": "2.0", "method": "eth_blockNumber",
                  "id": 1, "params": []},
            timeout=30,
        )
        r.raise_for_status()
        return int(r.json()["result"], 16)
    except Exception as exc:
        print(f"[warn] ETH block fetch failed ({exc}); writing null.")
        return None


# ── 2. DuckDB setup ───────────────────────────────────────────────────

def open_connection(resources: dict[str, dict]) -> duckdb.DuckDBPyConnection:
    """Vues DuckDB sur les Parquet dont l'URL vient du manifeste (jamais
    construite à la main ; hôte HTTPS contrôlé par source_manifest)."""
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    for table in TABLES:
        url = resources[table]["url"].replace("'", "''")
        con.execute(f"CREATE VIEW {table} AS SELECT * FROM read_parquet('{url}')")
    return con


def log_schemas(con: duckdb.DuckDBPyConnection) -> None:
    """Print every view's schema on first run. Uncomment columns in the
    queries below if anything here doesn't match what you expected."""
    print("\n╭── SCHEMA PROBE ──────────────────────────────────────")
    for table in TABLES:
        schema = con.execute(f"DESCRIBE {table}").df()
        cols = ", ".join(schema["column_name"].tolist())
        print(f"│ {table:38s}  ({len(schema)} cols)")
        print(f"│   {cols}")
    print("╰──────────────────────────────────────────────────────\n")


# ── 3. Scope: resolve location rows to ISO a3 and filter ──────────────

class SchemaError(RuntimeError):
    """Le schéma des fichiers de la source ne correspond pas à ce que le
    pipeline sait lire : arrêt explicite, jamais un calcul approximatif."""


# Colonnes indispensables ; pour l'identifiant de développeur, plusieurs noms
# sont acceptés (le premier trouvé est utilisé).
DEV_ID_CANDIDATES = ("canonical_developer_id", "developer_id", "id")
REQUIRED_COLUMNS = {
    "developer_activities": ("day", "num_commits"),
    "eco_developer_activities": ("ecosystem_id", "day"),
    "ecosystems": ("id", "name"),
    "canonical_developers": (),  # first_commit_date was removed upstream
    "canonical_developer_locations": ("country",),
}


def resolve_schema(con: duckdb.DuckDBPyConnection) -> dict:
    """Normalize verified upstream Parquet schemas without inventing data.

    New Electric Capital snapshots use canonical_developer_id in activity
    tables, locality instead of city and omit canonical_developers.first_commit_date.
    Compute first observed commit from activity dates when the field is absent.
    Older snapshots with legacy column names remain supported.
    """
    columns = {t: set(con.execute(f"DESCRIBE {t}").df()["column_name"].tolist()) for t in REQUIRED_COLUMNS}
    problems = [f"{t}: colonne « {c} » absente (colonnes : {', '.join(sorted(columns[t]))})"
                for t, cols in REQUIRED_COLUMNS.items() for c in cols if c not in columns[t]]

    def dev_id(table: str) -> str | None:
        found = next((c for c in DEV_ID_CANDIDATES if c in columns[table]), None)
        if found is None:
            problems.append(f"{table}: aucun identifiant de développeur parmi {', '.join(DEV_ID_CANDIDATES)}")
        return found

    ids = {table: dev_id(table) for table in (
        "canonical_developer_locations", "canonical_developers",
        "developer_activities", "eco_developer_activities",
    )}
    if problems:
        raise SchemaError("schéma de la source inattendu — " + " ; ".join(problems))

    city_col = "city" if "city" in columns["canonical_developer_locations"] else (
        "locality" if "locality" in columns["canonical_developer_locations"] else None
    )
    city_expr = city_col if city_col else "CAST(NULL AS VARCHAR)"
    con.execute(f"""
        CREATE OR REPLACE VIEW dev_locations AS
        SELECT {ids["canonical_developer_locations"]} AS developer_id, country, {city_expr} AS city
        FROM canonical_developer_locations
    """)
    con.execute(f"""
        CREATE OR REPLACE VIEW dev_activities AS
        SELECT {ids["developer_activities"]} AS developer_id, day, num_commits
        FROM developer_activities
    """)
    con.execute(f"""
        CREATE OR REPLACE VIEW eco_dev_activities AS
        SELECT {ids["eco_developer_activities"]} AS developer_id, ecosystem_id, day
        FROM eco_developer_activities
    """)
    if "first_commit_date" in columns["canonical_developers"]:
        # Legacy provider snapshots included the canonical start date.
        con.execute(f"""
            CREATE OR REPLACE VIEW dev_profiles AS
            SELECT {ids["canonical_developers"]} AS developer_id, first_commit_date
            FROM canonical_developers
        """)
        tenure_source = "canonical_developers.first_commit_date"
    else:
        # Verified 2026 upstream schema has no first_commit_date. The first
        # observed contribution is derived from REAL source activity records.
        # A developer with no activity cannot contribute to the cohort.
        con.execute("""
            CREATE OR REPLACE VIEW dev_profiles AS
            SELECT developer_id, min(day) AS first_commit_date
            FROM dev_activities
            GROUP BY developer_id
        """)
        tenure_source = "min(developer_activities.day)"
    return {
        "location_dev_id": ids["canonical_developer_locations"],
        "profile_dev_id": ids["canonical_developers"],
        "activity_dev_id": ids["developer_activities"],
        "ecosystem_activity_dev_id": ids["eco_developer_activities"],
        "has_city": bool(city_col), "city_source": city_col,
        "tenure_source": tenure_source,
    }

def register_scope(con: duckdb.DuckDBPyConnection) -> dict:
    """Résout les pays en ISO a3, filtre le périmètre Afrique/Caraïbes et
    enregistre scoped_devs : UNE ligne par développeur.

    Un développeur n'est rattaché qu'à un seul pays (le premier par ordre
    alphabétique ISO s'il en déclare plusieurs dans le périmètre) : c'est ce
    qui garantit que le total est la somme des pays.
    """
    resolve_schema(con)
    distinct = con.execute(
        "SELECT DISTINCT country FROM dev_locations WHERE country IS NOT NULL"
    ).df()
    distinct["iso_a3"] = distinct["country"].map(resolve_iso_a3)

    unresolved = sorted(set(distinct.loc[distinct["iso_a3"].isna(), "country"]))
    resolved = distinct.dropna(subset=["iso_a3"]).copy()
    scoped = resolved[resolved["iso_a3"].isin(SCOPE_ISO_A3)].copy()

    con.register("country_iso_map", scoped[["country", "iso_a3"]])

    con.execute("""
        CREATE OR REPLACE VIEW scoped_devs AS
        SELECT l.developer_id, min(m.iso_a3) AS iso_a3
        FROM dev_locations l
        JOIN country_iso_map m USING (country)
        GROUP BY l.developer_id
    """)

    return {
        "distinct_countries_seen": int(len(distinct)),
        "unresolved_country_names": unresolved,
        "countries_in_scope": int(scoped["iso_a3"].nunique()),
    }


# ── 4. Queries per chart ──────────────────────────────────────────────

def query_headline(con, country_map: list) -> dict:
    """Bloc principal. Développeurs actifs, commits et nombre de pays sont
    DÉRIVÉS de la table par pays (une seule définition, cohérente par
    construction) ; écosystèmes, villes et date viennent de requêtes dédiées.
    query_verification() recalcule ensuite les totaux indépendamment."""
    snapshot_date = con.execute("SELECT max(day) FROM dev_activities").fetchone()[0]

    ecosystems = con.execute("""
        SELECT count(DISTINCT eda.ecosystem_id) AS n
        FROM eco_dev_activities eda
        JOIN scoped_devs sd USING (developer_id)
    """).fetchone()[0]

    cities = con.execute("""
        SELECT count(DISTINCT (l.city, m.iso_a3)) AS n
        FROM dev_locations l
        JOIN country_iso_map m USING (country)
        JOIN scoped_devs sd ON sd.developer_id = l.developer_id AND sd.iso_a3 = m.iso_a3
        WHERE l.city IS NOT NULL AND l.city <> ''
    """).fetchone()[0]

    return {
        "devs_active_28d": int(sum(c["devs_active_28d"] for c in country_map)),
        "ecosystems": int(ecosystems or 0),
        "countries": len(country_map),
        "cities": int(cities or 0),
        "commits_lifetime": int(sum(c["commits_lifetime"] for c in country_map)),
        "snapshot_date": str(snapshot_date)[:10] if snapshot_date else None,
    }


def query_verification(con) -> dict:
    """Recalcul INDÉPENDANT des totaux, sans passer par l'agrégat par pays :
    comptage direct des développeurs actifs, somme directe des commits,
    décompte direct des pays ayant de l'activité. Écrit dans meta.verification
    et comparé aux indicateurs publiés par les contrôles (une différence
    bloque la version)."""
    devs = con.execute("""
        SELECT count(DISTINCT da.developer_id)
        FROM dev_activities da
        WHERE da.developer_id IN (SELECT developer_id FROM scoped_devs)
          AND da.day >= (SELECT max(day) FROM dev_activities) - INTERVAL 28 DAY
    """).fetchone()[0]
    commits = con.execute("""
        SELECT coalesce(sum(da.num_commits), 0)
        FROM dev_activities da
        WHERE da.developer_id IN (SELECT developer_id FROM scoped_devs)
    """).fetchone()[0]
    countries = con.execute("""
        SELECT count(DISTINCT sd.iso_a3)
        FROM scoped_devs sd
        WHERE EXISTS (SELECT 1 FROM dev_activities da WHERE da.developer_id = sd.developer_id)
    """).fetchone()[0]
    return {
        "method": "direct recount (no per-country aggregate)",
        "devs_active_28d": int(devs or 0),
        "commits_lifetime": int(commits or 0),
        "countries": int(countries or 0),
    }


def query_country_map(con) -> list:
    """One row per country: active devs (28d), commits all-time,
    commits last 12 months. Feeds the D3 choropleth."""
    df = con.execute("""
        WITH max_day AS (SELECT max(day) AS d FROM dev_activities),
             by_country AS (
                SELECT
                    sd.iso_a3,
                    count(DISTINCT da.developer_id) FILTER (
                        WHERE da.day >= max_day.d - INTERVAL 28 DAY
                    ) AS devs_active_28d,
                    coalesce(sum(da.num_commits), 0) AS commits_lifetime,
                    coalesce(sum(da.num_commits) FILTER (
                        WHERE da.day >= max_day.d - INTERVAL 365 DAY
                    ), 0) AS commits_last_12m
                FROM dev_activities da
                JOIN scoped_devs sd USING (developer_id), max_day
                GROUP BY sd.iso_a3
             )
        SELECT * FROM by_country
        ORDER BY commits_lifetime DESC
    """).df()

    rows = []
    for _, r in df.iterrows():
        iso = r["iso_a3"]
        rows.append({
            "iso_a3": iso,
            "name": country_name(iso),
            "region": REGION_BY_ISO.get(iso, "Other"),
            "devs_active_28d": int(r["devs_active_28d"] or 0),
            "commits_lifetime": int(r["commits_lifetime"] or 0),
            "commits_last_12m": int(r["commits_last_12m"] or 0),
        })
    return rows


def query_top_cities(con, limit: int = 12) -> list:
    """Villes comptant le plus de développeurs actifs (28 jours). Un
    développeur est compté dans une ville de SON pays de rattachement, ce qui
    garantit qu'une ville ne dépasse jamais son pays."""
    df = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM dev_activities),
             recent AS (
                SELECT DISTINCT da.developer_id
                FROM dev_activities da, max_day
                WHERE da.day >= max_day.d - INTERVAL 28 DAY
             )
        SELECT
            l.city,
            min(l.country) AS country,
            m.iso_a3,
            count(DISTINCT l.developer_id) AS devs_active_28d
        FROM dev_locations l
        JOIN country_iso_map m USING (country)
        JOIN scoped_devs sd ON sd.developer_id = l.developer_id AND sd.iso_a3 = m.iso_a3
        JOIN recent r ON r.developer_id = l.developer_id
        WHERE l.city IS NOT NULL AND l.city <> ''
        GROUP BY l.city, m.iso_a3
        ORDER BY devs_active_28d DESC, l.city
        LIMIT {limit}
    """).df()

    return [
        {
            "rank": i + 1,
            "city": r["city"],
            "country": r["country"],
            "iso_a3": r["iso_a3"],
            "devs_active_28d": int(r["devs_active_28d"]),
        }
        for i, r in df.iterrows()
    ]


def month_axis(con, months: int = 48) -> list:
    """Axe mensuel commun aux séries (écosystèmes et ancienneté) : du mois
    situé `months` mois avant le dernier jour connu jusqu'au mois de ce jour."""
    df = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM dev_activities)
        SELECT unnest(generate_series(
            date_trunc('month', max_day.d - INTERVAL {months} MONTH),
            date_trunc('month', max_day.d),
            INTERVAL 1 MONTH)) AS month
        FROM max_day
    """).df()
    return [m.strftime("%Y-%m") for m in df["month"]]


def query_ecosystem_mix(con, axis: list, top_n: int = 8, months: int = 48) -> dict:
    """Top ecosystems ranked by distinct scoped devs over the last 28
    days. Monthly active-dev time series for each, indexed to 100 at
    series start so shapes are comparable regardless of volume."""
    # 1. Rank ecosystems by recent scoped devs
    ranked = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM eco_dev_activities)
        SELECT e.id, e.name,
               count(DISTINCT eda.developer_id) AS devs_recent
        FROM eco_dev_activities eda
        JOIN scoped_devs sd USING (developer_id)
        JOIN ecosystems e ON e.id = eda.ecosystem_id, max_day
        WHERE eda.day >= max_day.d - INTERVAL 28 DAY
        GROUP BY e.id, e.name
        ORDER BY devs_recent DESC
        LIMIT {top_n}
    """).df()

    if ranked.empty:
        return {"ecosystems": [], "months": axis}

    ids = ranked["id"].tolist()
    id_list_sql = ", ".join(str(x) for x in ids)

    # 2. Monthly active devs per ecosystem, scoped to AFR+CARIB devs.
    #    Active = at least one activity in that calendar month.
    monthly = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM dev_activities),
             start_day AS (
                SELECT date_trunc('month', max_day.d - INTERVAL {months} MONTH) AS d
                FROM max_day
             )
        SELECT
            eda.ecosystem_id,
            date_trunc('month', eda.day) AS month,
            count(DISTINCT eda.developer_id) AS devs
        FROM eco_dev_activities eda
        JOIN scoped_devs sd USING (developer_id), start_day
        WHERE eda.ecosystem_id IN ({id_list_sql})
          AND eda.day >= start_day.d
        GROUP BY eda.ecosystem_id, date_trunc('month', eda.day)
        ORDER BY eda.ecosystem_id, month
    """).df()

    # 3. Reshape per-ecosystem with indexed series.
    out = []
    # Axe commun : un mois sans aucune ligne d'activité vaut 0 développeur
    # (décompte réel, pas une valeur interpolée).
    monthly["label"] = [m.strftime("%Y-%m") for m in monthly["month"]]
    month_labels = axis

    for _, eco in ranked.iterrows():
        eco_rows = monthly[monthly["ecosystem_id"] == eco["id"]]
        devs_by_month = dict(zip(eco_rows["label"], eco_rows["devs"]))
        series = [int(devs_by_month.get(m, 0)) for m in axis]

        # Index to 100 at first non-zero value
        baseline = next((v for v in series if v > 0), None)
        indexed = (
            [round(100 * v / baseline, 1) if baseline else 0.0 for v in series]
            if baseline else [0.0] * len(series)
        )

        out.append({
            "id": int(eco["id"]),
            "name": eco["name"],
            "devs_recent": int(eco["devs_recent"]),
            "series_devs": series,
            "series_indexed": indexed,
        })

    return {
        "ecosystems": out,
        "months": month_labels,
    }


def query_tenure_cohort(con, axis: list, months: int = 48) -> dict:
    """Monthly stack of 0–1y / 1–2y / 2y+ developers among scoped devs.

    Tenure is measured as months since each developer's first commit
    (from an upstream date field when available, otherwise the earliest
    month's start. A dev is counted in the month if they had any
    activity in that calendar month.
    """
    df = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM dev_activities),
             start_day AS (
                SELECT date_trunc('month',
                                 max_day.d - INTERVAL {months} MONTH) AS d
                FROM max_day
             ),
             monthly_activity AS (
                SELECT
                    da.developer_id,
                    date_trunc('month', da.day) AS month
                FROM dev_activities da
                JOIN scoped_devs sd USING (developer_id), start_day
                WHERE da.day >= start_day.d
                GROUP BY da.developer_id, date_trunc('month', da.day)
             ),
             with_tenure AS (
                SELECT
                    ma.month,
                    ma.developer_id,
                    date_diff('month', cd.first_commit_date, ma.month)
                        AS months_since_first
                FROM monthly_activity ma
                JOIN dev_profiles cd USING (developer_id)
                WHERE cd.first_commit_date IS NOT NULL
             )
        SELECT
            month,
            count(DISTINCT CASE WHEN months_since_first < 12
                THEN developer_id END) AS devs_0_1y,
            count(DISTINCT CASE WHEN months_since_first BETWEEN 12 AND 23
                THEN developer_id END) AS devs_1_2y,
            count(DISTINCT CASE WHEN months_since_first >= 24
                THEN developer_id END) AS devs_2y_plus
        FROM with_tenure
        GROUP BY month
        ORDER BY month
    """).df()

    by_month = {m.strftime("%Y-%m"): r for m, (_, r) in zip(df["month"], df.iterrows())}
    pick = lambda key: [int(by_month[m][key]) if m in by_month else 0 for m in axis]  # noqa: E731
    return {
        "months": axis,
        "devs_0_1y": pick("devs_0_1y"),
        "devs_1_2y": pick("devs_1_2y"),
        "devs_2y_plus": pick("devs_2y_plus"),
    }


# ── 5. Write everything ───────────────────────────────────────────────

def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, indent=2, default=str))
    print(f"  → wrote {path} ({path.stat().st_size:,} bytes)")


from pipeline_version import PIPELINE_VERSION  # noqa: E402
OUTPUT_FILES = (
    "meta.json",
    "headline.json",
    "country_map.json",
    "top_cities.json",
    "ecosystem_mix.json",
    "tenure_cohort.json",
)


def compute_all(con) -> tuple:
    """Tous les indicateurs à partir d'une connexion dont le périmètre est
    enregistré (register_scope). Séparé de main() pour être testable hors ligne."""
    print("→ running country-map query…")
    country_map = query_country_map(con)

    print("→ running headline query…")
    headline = query_headline(con, country_map)

    print("→ running independent verification…")
    verification = query_verification(con)

    print("→ running top-cities query…")
    top_cities = query_top_cities(con)

    axis = month_axis(con)
    print("→ running ecosystem-mix query…")
    ecosystem_mix = query_ecosystem_mix(con, axis)

    print("→ running tenure-cohort query…")
    tenure_cohort = query_tenure_cohort(con, axis)
    return headline, country_map, top_cities, ecosystem_mix, tenure_cohort, verification


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR,
                        help="Destination of the validated JSON files.")
    parser.add_argument("--version", default=None,
                        help="Logical version to publish (default: manifest version). "
                             "A correction of an existing version uses <version>-rN.")
    args = parser.parse_args()
    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    print("→ reading source manifest…")
    try:
        manifest = fetch_manifest()
        resources = table_resources(manifest, TABLES)
        source_version = version_of(manifest)
        source_fingerprint = fingerprint(manifest, TABLES)
    except ManifestError as exc:
        print(f"✗ source manifest: {exc}")
        sys.exit(3)
    version = args.version or source_version
    if version != source_version and not version.startswith(f"{source_version}-r"):
        print(f"✗ requested version {version!r} does not match the manifest ({source_version!r}): "
              "the source moved on, rerun the version check.")
        sys.exit(3)
    print(f"  version: {version} (source {source_version}, fingerprint {source_fingerprint[:12]}…)")

    print("→ verifying source resources…")
    problems = verify_resources(resources)
    if problems:
        print("✗ source resources failed integrity checks:")
        for pb in problems:
            print(f"  · {pb}")
        sys.exit(3)

    print("→ opening DuckDB + httpfs views…")
    con = open_connection(resources)
    log_schemas(con)

    print("→ registering AFR+CARIB scope…")
    try:
        scope_diag = register_scope(con)
    except SchemaError as exc:
        print(f"✗ {exc}")
        sys.exit(4)
    print(f"  countries in scope: {scope_diag['countries_in_scope']}")
    if scope_diag["unresolved_country_names"]:
        print(f"  [info] {len(scope_diag['unresolved_country_names'])} "
              f"country names unresolved — add to NAME_OVERRIDES if any "
              f"look in-scope:")
        for name in scope_diag["unresolved_country_names"][:20]:
            print(f"    · {name!r}")

    print("→ fetching ETH block…")
    block = get_eth_block()
    print(f"  block: {block}")

    headline, country_map, top_cities, ecosystem_mix, tenure_cohort, verification = compute_all(con)

    meta = {
        "dataset_version": version,
        "source_version": source_version,
        "source_fingerprint": source_fingerprint,
        "source_resources": [
            {"table": t, "path": resources[t]["path"], "size_bytes": resources[t]["size_bytes"], "b3sum": resources[t]["b3sum"]}
            for t in sorted(resources)
        ],
        "pipeline_version": PIPELINE_VERSION,
        "verification": verification,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "block_number": block,
        "source": {
            "name": "Electric Capital Open Source Developer Data",
            "url": "https://opendevdata.org",
            "license": "CC BY 4.0",
        },
        "scope": {
            "regions": ["Africa", "Caribbean"],
            "countries_in_scope": scope_diag["countries_in_scope"],
            "methodology_note": (
                "Developers are included by inferred geographic location "
                "(from GitHub profile + commit metadata). Diaspora "
                "developers located outside the scoped regions are not "
                "counted: these figures are not a measure of the global "
                "diaspora — see methodology."
            ),
            "unresolved_country_names": scope_diag["unresolved_country_names"],
        },
    }

    # Écriture dans un dossier temporaire puis validation du LOT complet : un
    # calcul invalide ne remplace jamais les fichiers en place.
    # Le remplacement des six fichiers n'est pas atomique au niveau du système
    # de fichiers ; la cohérence publiée est garantie en aval (version Supabase
    # courante déplacée en une transaction par publish_dataset_candidate).
    print("→ writing JSON to a staging directory…")
    with tempfile.TemporaryDirectory() as tmp:
        staging = Path(tmp)
        write_json(staging / "meta.json", meta)
        write_json(staging / "headline.json", headline)
        write_json(staging / "country_map.json", country_map)
        write_json(staging / "top_cities.json", top_cities)
        write_json(staging / "ecosystem_mix.json", ecosystem_mix)
        write_json(staging / "tenure_cohort.json", tenure_cohort)

        print("→ validating…")
        errors = validate_output_dir(staging)
        # Un nouveau lot doit aussi être cohérent entre fichiers.
        errors += [] if errors else consistency_anomalies(staging)
        if errors:
            print("✗ validation failed — previous files left untouched:")
            for err in errors:
                print(f"  · {err}")
            sys.exit(2)

        # Le lot en place est archivé (copie exacte + SHA-256) avant d'être
        # remplacé : chaque version publiée reste identifiable et restaurable.
        if output_dir == OUTPUT_DIR:
            archived = archive_current(output_dir)
            if archived:
                print(f"  → previous snapshot archived: data/state-of-bib/history/{archived}/")

        # Deux phases pour réduire la fenêtre d'incohérence : copie de tous les
        # fichiers sous un nom temporaire, puis renommages (os.replace).
        for name in OUTPUT_FILES:
            shutil.copyfile(staging / name, output_dir / f".{name}.incoming")
        for name in OUTPUT_FILES:
            os.replace(output_dir / f".{name}.incoming", output_dir / name)
            print(f"  → published {output_dir / name}")

    print("\n✓ done.")


if __name__ == "__main__":
    main()
