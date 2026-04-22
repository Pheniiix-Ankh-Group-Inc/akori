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

import json
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import requests

from country_scope import (
    SCOPE_ISO_A3,
    REGION_BY_ISO,
    resolve_iso_a3,
    country_name,
)

MANIFEST_URL = "https://data.opendevdata.org/manifest.json"
ETH_RPC = "https://cloudflare-eth.com"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

# Tables we create views over. Not every query touches every table;
# listing them here just makes the view setup uniform.
TABLES = [
    "ecosystems",
    "canonical_developer_locations",
    "canonical_developers",
    "eco_mads",
    "eco_developer_activities",
    "developer_activities",
]


# ── 1. Snapshot resolution ────────────────────────────────────────────

def get_dataset_version() -> str:
    r = requests.get(MANIFEST_URL, timeout=60)
    r.raise_for_status()
    return r.json()["dataset"]["version"]


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

def open_connection(version: str) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    base = f"https://data.developerreport.com/snapshots/{version}/"
    for table in TABLES:
        con.execute(
            f"CREATE VIEW {table} AS "
            f"SELECT * FROM read_parquet('{base}{table}.parquet')"
        )
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

def register_scope(con: duckdb.DuckDBPyConnection) -> dict:
    """Pull distinct country names from canonical_developer_locations,
    resolve each to ISO a3, and register a (developer_id, iso_a3) view
    that every downstream query joins against.

    Returns a dict of diagnostics including unresolved names.
    """
    distinct = con.execute(
        "SELECT DISTINCT country "
        "FROM canonical_developer_locations "
        "WHERE country IS NOT NULL"
    ).df()
    distinct["iso_a3"] = distinct["country"].map(resolve_iso_a3)

    unresolved = sorted(set(distinct.loc[distinct["iso_a3"].isna(), "country"]))
    resolved = distinct.dropna(subset=["iso_a3"]).copy()
    scoped = resolved[resolved["iso_a3"].isin(SCOPE_ISO_A3)].copy()

    con.register("country_iso_map", scoped[["country", "iso_a3"]])

    # Devs in scope — one row per (developer_id, iso_a3)
    con.execute("""
        CREATE OR REPLACE VIEW scoped_devs AS
        SELECT cdl.developer_id, m.iso_a3
        FROM canonical_developer_locations cdl
        JOIN country_iso_map m USING (country)
    """)

    return {
        "distinct_countries_seen": int(len(distinct)),
        "unresolved_country_names": unresolved,
        "countries_in_scope": int(scoped["iso_a3"].nunique()),
    }


# ── 4. Queries per chart ──────────────────────────────────────────────

def query_headline(con) -> dict:
    """Hero block: one number per card.

    Active developers = distinct scoped devs with activity in the last 28
    days of the snapshot. Commits_lifetime = all-time commits by scoped
    devs. Ecosystems = distinct ecosystems those devs touched. Cities is
    populated only if canonical_developer_locations has a city column.
    """
    # Active devs (last 28d by developer_activities.day)
    row = con.execute("""
        WITH max_day AS (SELECT max(day) AS d FROM developer_activities),
             recent AS (
                SELECT DISTINCT da.developer_id
                FROM developer_activities da, max_day
                WHERE da.day >= max_day.d - INTERVAL 28 DAY
             )
        SELECT
            (SELECT count(DISTINCT sd.developer_id)
               FROM scoped_devs sd JOIN recent USING (developer_id))
                AS devs_active_28d,
            (SELECT count(DISTINCT sd.iso_a3) FROM scoped_devs sd)
                AS countries,
            (SELECT max(day) FROM developer_activities)
                AS snapshot_date
    """).fetchone()

    devs_28d, countries, snapshot_date = row

    # Ecosystems touched by scoped devs
    ecosystems = con.execute("""
        SELECT count(DISTINCT eda.ecosystem_id) AS n
        FROM eco_developer_activities eda
        JOIN scoped_devs sd USING (developer_id)
    """).fetchone()[0]

    # Total commits lifetime
    commits = con.execute("""
        SELECT sum(da.num_commits) AS n
        FROM developer_activities da
        JOIN scoped_devs sd USING (developer_id)
    """).fetchone()[0]

    # Cities — optional (column may not exist)
    try:
        cities = con.execute("""
            SELECT count(DISTINCT cdl.city) AS n
            FROM canonical_developer_locations cdl
            JOIN scoped_devs sd USING (developer_id)
            WHERE cdl.city IS NOT NULL
        """).fetchone()[0]
    except duckdb.BinderException:
        cities = None

    return {
        "devs_active_28d": int(devs_28d or 0),
        "ecosystems": int(ecosystems or 0),
        "countries": int(countries or 0),
        "cities": int(cities) if cities is not None else None,
        "commits_lifetime": int(commits or 0),
        "snapshot_date": str(snapshot_date) if snapshot_date else None,
    }


def query_country_map(con) -> list:
    """One row per country: active devs (28d), commits all-time,
    commits last 12 months. Feeds the D3 choropleth."""
    df = con.execute("""
        WITH max_day AS (SELECT max(day) AS d FROM developer_activities),
             by_country AS (
                SELECT
                    sd.iso_a3,
                    count(DISTINCT da.developer_id) FILTER (
                        WHERE da.day >= max_day.d - INTERVAL 28 DAY
                    ) AS devs_active_28d,
                    sum(da.num_commits) AS commits_lifetime,
                    sum(da.num_commits) FILTER (
                        WHERE da.day >= max_day.d - INTERVAL 365 DAY
                    ) AS commits_last_12m
                FROM developer_activities da
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
    """Top cities by active developers in the last 28 days. Only
    meaningful if canonical_developer_locations has a city column."""
    try:
        df = con.execute(f"""
            WITH max_day AS (SELECT max(day) AS d FROM developer_activities),
                 recent AS (
                    SELECT DISTINCT da.developer_id
                    FROM developer_activities da, max_day
                    WHERE da.day >= max_day.d - INTERVAL 28 DAY
                 )
            SELECT
                cdl.city,
                cdl.country,
                m.iso_a3,
                count(DISTINCT cdl.developer_id) AS devs_active_28d
            FROM canonical_developer_locations cdl
            JOIN country_iso_map m USING (country)
            JOIN recent USING (developer_id)
            WHERE cdl.city IS NOT NULL AND cdl.city <> ''
            GROUP BY cdl.city, cdl.country, m.iso_a3
            ORDER BY devs_active_28d DESC
            LIMIT {limit}
        """).df()
    except duckdb.BinderException:
        print("[warn] canonical_developer_locations has no `city` column; "
              "top_cities.json will be empty.")
        return []

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


def query_ecosystem_mix(con, top_n: int = 8, months: int = 48) -> dict:
    """Top ecosystems ranked by distinct scoped devs over the last 28
    days. Monthly active-dev time series for each, indexed to 100 at
    series start so shapes are comparable regardless of volume."""
    # 1. Rank ecosystems by recent scoped devs
    ranked = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM eco_developer_activities)
        SELECT e.id, e.name,
               count(DISTINCT eda.developer_id) AS devs_recent
        FROM eco_developer_activities eda
        JOIN scoped_devs sd USING (developer_id)
        JOIN ecosystems e ON e.id = eda.ecosystem_id, max_day
        WHERE eda.day >= max_day.d - INTERVAL 28 DAY
        GROUP BY e.id, e.name
        ORDER BY devs_recent DESC
        LIMIT {top_n}
    """).df()

    if ranked.empty:
        return {"ecosystems": [], "month_range": []}

    ids = ranked["id"].tolist()
    id_list_sql = ", ".join(str(x) for x in ids)

    # 2. Monthly active devs per ecosystem, scoped to AFR+CARIB devs.
    #    Active = at least one activity in that calendar month.
    monthly = con.execute(f"""
        WITH max_day AS (SELECT max(day) AS d FROM eco_developer_activities),
             start_day AS (
                SELECT date_trunc('month', max_day.d - INTERVAL {months} MONTH) AS d
                FROM max_day
             )
        SELECT
            eda.ecosystem_id,
            date_trunc('month', eda.day) AS month,
            count(DISTINCT eda.developer_id) AS devs
        FROM eco_developer_activities eda
        JOIN scoped_devs sd USING (developer_id), start_day
        WHERE eda.ecosystem_id IN ({id_list_sql})
          AND eda.day >= start_day.d
        GROUP BY eda.ecosystem_id, date_trunc('month', eda.day)
        ORDER BY eda.ecosystem_id, month
    """).df()

    # 3. Reshape per-ecosystem with indexed series.
    out = []
    all_months = sorted(monthly["month"].unique())
    month_labels = [m.strftime("%Y-%m") for m in all_months]

    for _, eco in ranked.iterrows():
        eco_rows = monthly[monthly["ecosystem_id"] == eco["id"]]
        devs_by_month = dict(zip(eco_rows["month"], eco_rows["devs"]))
        series = [int(devs_by_month.get(m, 0)) for m in all_months]

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


def query_tenure_cohort(con, months: int = 48) -> dict:
    """Monthly stack of 0–1y / 1–2y / 2y+ developers among scoped devs.

    Tenure is measured as months since each developer's first commit
    (from canonical_developers.first_commit_date), evaluated at each
    month's start. A dev is counted in the month if they had any
    activity in that calendar month.
    """
    try:
        df = con.execute(f"""
            WITH max_day AS (SELECT max(day) AS d FROM developer_activities),
                 start_day AS (
                    SELECT date_trunc('month',
                                     max_day.d - INTERVAL {months} MONTH) AS d
                    FROM max_day
                 ),
                 monthly_activity AS (
                    SELECT
                        da.developer_id,
                        date_trunc('month', da.day) AS month
                    FROM developer_activities da
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
                    JOIN canonical_developers cd USING (developer_id)
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
    except duckdb.BinderException as exc:
        print(f"[warn] tenure cohort query failed ({exc}); "
              "likely canonical_developers lacks first_commit_date.")
        return {"months": [], "devs_0_1y": [], "devs_1_2y": [], "devs_2y_plus": []}

    return {
        "months": [m.strftime("%Y-%m") for m in df["month"]],
        "devs_0_1y": [int(x) for x in df["devs_0_1y"]],
        "devs_1_2y": [int(x) for x in df["devs_1_2y"]],
        "devs_2y_plus": [int(x) for x in df["devs_2y_plus"]],
    }


# ── 5. Write everything ───────────────────────────────────────────────

def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, indent=2, default=str))
    print(f"  → wrote {path} ({path.stat().st_size:,} bytes)")


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("→ resolving dataset version…")
    version = get_dataset_version()
    print(f"  version: {version}")

    print("→ opening DuckDB + httpfs views…")
    con = open_connection(version)
    log_schemas(con)

    print("→ registering AFR+CARIB scope…")
    scope_diag = register_scope(con)
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

    print("→ running headline query…")
    headline = query_headline(con)

    print("→ running country-map query…")
    country_map = query_country_map(con)

    print("→ running top-cities query…")
    top_cities = query_top_cities(con)

    print("→ running ecosystem-mix query…")
    ecosystem_mix = query_ecosystem_mix(con)

    print("→ running tenure-cohort query…")
    tenure_cohort = query_tenure_cohort(con)

    meta = {
        "dataset_version": version,
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
                "counted — see methodology."
            ),
            "unresolved_country_names": scope_diag["unresolved_country_names"],
        },
    }

    print("→ writing JSON…")
    write_json(OUTPUT_DIR / "meta.json", meta)
    write_json(OUTPUT_DIR / "headline.json", headline)
    write_json(OUTPUT_DIR / "country_map.json", country_map)
    write_json(OUTPUT_DIR / "top_cities.json", top_cities)
    write_json(OUTPUT_DIR / "ecosystem_mix.json", ecosystem_mix)
    write_json(OUTPUT_DIR / "tenure_cohort.json", tenure_cohort)

    print("\n✓ done.")


if __name__ == "__main__":
    main()
