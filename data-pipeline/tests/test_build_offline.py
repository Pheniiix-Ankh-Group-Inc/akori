"""Calcul des indicateurs sur des tables DuckDB locales (aucun réseau).

Vérifie que le lot produit est cohérent PAR CONSTRUCTION, que le recalcul
indépendant concorde, et qu'un schéma inattendu arrête le traitement.
Ignoré si duckdb/pandas ne sont pas installés.
"""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

try:
    import duckdb  # noqa: F401
    import pandas  # noqa: F401

    import build_data as bd
    HAVE = True
except ImportError:  # pragma: no cover
    HAVE = False

from validate import consistency_anomalies, validate_output_dir  # noqa: E402


def make_db(location_dev_col: str = "canonical_developer_id", with_city: bool = True):
    con = duckdb.connect()
    con.execute("CREATE TABLE ecosystems (id INTEGER, name VARCHAR)")
    con.execute("INSERT INTO ecosystems VALUES (1, 'Alpha'), (2, 'Beta')")
    city = ", city VARCHAR" if with_city else ""
    con.execute(f"CREATE TABLE canonical_developer_locations ({location_dev_col} INTEGER, country VARCHAR{city})")
    rows = [
        (1, "Nigeria", "Lagos"), (2, "Nigeria", "Lagos"), (3, "Nigeria", "Abuja"),
        (4, "Kenya", "Nairobi"), (5, "Jamaica", "Kingston"),
        (5, "Kenya", "Nairobi"),      # deux pays du périmètre : rattaché à un seul
        (6, "France", "Paris"),       # hors périmètre
        (7, "Kenya", None),
    ]
    for r in rows:
        if with_city:
            con.execute("INSERT INTO canonical_developer_locations VALUES (?, ?, ?)", r)
        else:
            con.execute("INSERT INTO canonical_developer_locations VALUES (?, ?)", r[:2])
    con.execute("CREATE TABLE canonical_developers (developer_id INTEGER, first_commit_date DATE)")
    for dev, d in [(1, "2020-01-01"), (2, "2025-06-01"), (3, "2024-01-01"), (4, "2022-03-01"), (5, "2026-01-01"), (6, "2019-01-01"), (7, "2023-01-01")]:
        con.execute("INSERT INTO canonical_developers VALUES (?, ?)", (dev, d))
    con.execute("CREATE TABLE developer_activities (developer_id INTEGER, day DATE, num_commits INTEGER)")
    acts = [
        (1, "2026-10-20", 5), (1, "2026-03-02", 7), (2, "2026-10-25", 3), (3, "2025-12-01", 9),
        (4, "2026-10-30", 2), (5, "2026-10-15", 4), (6, "2026-10-29", 50), (7, "2026-09-01", 1),
        (1, "2023-05-05", 11),
    ]
    for a in acts:
        con.execute("INSERT INTO developer_activities VALUES (?, ?, ?)", a)
    con.execute("CREATE TABLE eco_developer_activities (developer_id INTEGER, ecosystem_id INTEGER, day DATE)")
    for a in [(1, 1, "2026-10-20"), (2, 1, "2026-10-25"), (4, 2, "2026-10-30"), (5, 2, "2026-10-15"), (6, 1, "2026-10-29"), (1, 2, "2026-03-02")]:
        con.execute("INSERT INTO eco_developer_activities VALUES (?, ?, ?)", a)
    con.execute("CREATE TABLE eco_mads (x INTEGER)")
    return con


@unittest.skipUnless(HAVE, "duckdb / pandas non installés")
class OfflineBuildTest(unittest.TestCase):
    def build(self, con):
        scope = bd.register_scope(con)
        headline, countries, cities, eco, cohort, verification = bd.compute_all(con)
        return scope, headline, countries, cities, eco, cohort, verification

    def test_lot_is_consistent_by_construction(self):
        scope, headline, countries, cities, eco, cohort, verification = self.build(make_db())
        # Actifs sur 28 jours avant le 2026-10-30 : 1, 2, 4, 5 (6 est hors périmètre).
        self.assertEqual(headline["devs_active_28d"], 4)
        self.assertEqual(headline["snapshot_date"], "2026-10-30")
        self.assertEqual(headline["countries"], len(countries))
        self.assertEqual(sum(c["devs_active_28d"] for c in countries), headline["devs_active_28d"])
        self.assertEqual(sum(c["commits_lifetime"] for c in countries), headline["commits_lifetime"])
        self.assertEqual(headline["commits_lifetime"], 5 + 7 + 11 + 3 + 9 + 2 + 4 + 1)
        # Recalcul indépendant : mêmes totaux par un autre chemin.
        for key in ("devs_active_28d", "commits_lifetime", "countries"):
            self.assertEqual(verification[key], headline[key], key)
        # Le développeur 5 (Jamaïque + Kenya) n'est compté qu'une fois, dans un seul pays.
        self.assertEqual({c["iso_a3"] for c in countries}, {"NGA", "KEN", "JAM"})
        by_iso = {c["iso_a3"]: c["devs_active_28d"] for c in countries}
        self.assertEqual(by_iso, {"NGA": 2, "KEN": 1, "JAM": 1})
        # Aucune ville au-dessus de son pays ; rangs consécutifs.
        for c in cities:
            self.assertLessEqual(c["devs_active_28d"], by_iso[c["iso_a3"]])
        self.assertEqual([c["rank"] for c in cities], list(range(1, len(cities) + 1)))
        # Séries sur le même axe mensuel, sans trou, jusqu'au mois de l'instantané.
        self.assertEqual(eco["months"], cohort["months"])
        self.assertEqual(eco["months"][-1], "2026-10")
        self.assertEqual(len(eco["months"]), 49)
        self.assertTrue(all(len(e["series_devs"]) == 49 for e in eco["ecosystems"]))

    def test_written_lot_passes_every_automatic_check(self):
        scope, headline, countries, cities, eco, cohort, verification = self.build(make_db())
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            meta = {"dataset_version": "t1", "pipeline_version": bd.PIPELINE_VERSION, "verification": verification,
                    "generated_at": "2026-11-01T00:00:00+00:00", "block_number": None,
                    "source": {"name": "Source de test", "license": "CC BY 4.0"},
                    "scope": {"regions": ["Africa", "Caribbean"], "countries_in_scope": scope["countries_in_scope"]}}
            for name, obj in (("meta.json", meta), ("headline.json", headline), ("country_map.json", countries),
                              ("top_cities.json", cities), ("ecosystem_mix.json", eco), ("tenure_cohort.json", cohort)):
                (d / name).write_text(json.dumps(obj))
            self.assertEqual(validate_output_dir(d), [])
            self.assertEqual(consistency_anomalies(d), [])

    def test_alternate_developer_id_column_is_resolved(self):
        _, headline, *_ = self.build(make_db(location_dev_col="developer_id"))
        self.assertEqual(headline["devs_active_28d"], 4)

    def test_missing_city_column_is_supported(self):
        _, headline, _, cities, *_ = self.build(make_db(with_city=False))
        self.assertEqual(cities, [])
        self.assertEqual(headline["cities"], 0)

    def test_unexpected_schema_stops_the_build(self):
        con = make_db()
        con.execute("ALTER TABLE developer_activities RENAME COLUMN num_commits TO commits")
        with self.assertRaises(bd.SchemaError) as ctx:
            bd.register_scope(con)
        self.assertIn("num_commits", str(ctx.exception))
        con2 = make_db(location_dev_col="dev_ref")
        with self.assertRaises(bd.SchemaError):
            bd.register_scope(con2)


if __name__ == "__main__":
    unittest.main()
