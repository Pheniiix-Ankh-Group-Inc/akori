"""Tests : archivage des versions et cohérence entre fichiers (sans réseau).

Exécution : python -m unittest discover -s data-pipeline/tests -v
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import history  # noqa: E402
from validate import consistency_anomalies, validate_output_dir  # noqa: E402

DATA = HERE.parent.parent / "data" / "state-of-bib" / "current"


def consistent_lot(directory: Path) -> None:
    """Lot fictif minimal et cohérent (valeurs inventées pour le test seulement)."""
    months = ["2026-01", "2026-02", "2026-03"]
    files = {
        "meta.json": {"dataset_version": "T1", "pipeline_version": "test", "generated_at": "2026-04-01T00:00:00Z",
                      "source": {"name": "Test source", "license": "CC BY 4.0"}, "scope": {"countries_in_scope": 2}},
        "headline.json": {"devs_active_28d": 30, "ecosystems": 2, "countries": 2, "cities": 2,
                          "commits_lifetime": 300, "snapshot_date": "2026-03-31"},
        "country_map.json": [
            {"iso_a3": "AAA", "name": "A", "region": "Africa", "devs_active_28d": 20, "commits_lifetime": 200, "commits_last_12m": 50},
            {"iso_a3": "BBB", "name": "B", "region": "Caribbean", "devs_active_28d": 10, "commits_lifetime": 100, "commits_last_12m": 20},
        ],
        "top_cities.json": [
            {"rank": 1, "city": "X", "country": "A", "iso_a3": "AAA", "devs_active_28d": 15},
            {"rank": 2, "city": "Y", "country": "B", "iso_a3": "BBB", "devs_active_28d": 8},
        ],
        "ecosystem_mix.json": {"months": months, "ecosystems": [{"id": 1, "name": "E", "devs_recent": 5, "series_devs": [1, 2, 3]}]},
        "tenure_cohort.json": {"months": months, "devs_0_1y": [1, 2, 3], "devs_1_2y": [1, 1, 1], "devs_2y_plus": [0, 1, 2]},
    }
    directory.mkdir(parents=True, exist_ok=True)
    for name, obj in files.items():
        (directory / name).write_text(json.dumps(obj))


class HistoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.data, self.hist = self.tmp / "data", self.tmp / "history"
        consistent_lot(self.data)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_archive_copie_exacte_et_index(self):
        self.assertEqual(history.archive_current(self.data, self.hist), "T1")
        for f in history.FILES:
            self.assertEqual((self.hist / "T1" / f).read_bytes(), (self.data / f).read_bytes())
        index = json.loads((self.hist / "index.json").read_text())
        self.assertEqual([v["dataset_version"] for v in index["versions"]], ["T1"])
        self.assertEqual(index["versions"][0]["snapshot_date"], "2026-03-31")
        self.assertEqual(history.check(self.hist), [])

    def test_idempotent(self):
        history.archive_current(self.data, self.hist)
        history.archive_current(self.data, self.hist)
        index = json.loads((self.hist / "index.json").read_text())
        self.assertEqual(len(index["versions"]), 1)

    def test_refuse_meme_version_contenu_different(self):
        history.archive_current(self.data, self.hist)
        h = json.loads((self.data / "headline.json").read_text())
        h["devs_active_28d"] = 31
        (self.data / "headline.json").write_text(json.dumps(h))
        with self.assertRaises(ValueError):
            history.archive_current(self.data, self.hist)

    def test_detecte_alteration(self):
        history.archive_current(self.data, self.hist)
        (self.hist / "T1" / "headline.json").write_text("{}")
        self.assertTrue(history.check(self.hist))

    def test_version_invalide_refusee(self):
        m = json.loads((self.data / "meta.json").read_text())
        m["dataset_version"] = "../evil"
        (self.data / "meta.json").write_text(json.dumps(m))
        with self.assertRaises(ValueError):
            history.archive_current(self.data, self.hist)

    def test_historique_du_depot_integre(self):
        self.assertEqual(history.check(), [])


class ConsistencyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        consistent_lot(self.tmp)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_lot_coherent(self):
        self.assertEqual(validate_output_dir(self.tmp), [])
        self.assertEqual(consistency_anomalies(self.tmp), [])

    def mutate(self, name, fn):
        obj = json.loads((self.tmp / name).read_text())
        fn(obj)
        (self.tmp / name).write_text(json.dumps(obj))
        return consistency_anomalies(self.tmp)

    def test_totaux_incoherents(self):
        out = self.mutate("headline.json", lambda h: h.update(devs_active_28d=99, countries=5, commits_lifetime=1))
        self.assertEqual(len(out), 3)

    def test_ville_superieure_au_pays(self):
        out = self.mutate("top_cities.json", lambda c: c[0].update(devs_active_28d=500))
        self.assertTrue(any("plus que le pays" in a for a in out))

    def test_valeur_manquante_et_longueur(self):
        out = self.mutate("ecosystem_mix.json", lambda e: e["ecosystems"][0].update(series_devs=[1, None]))
        self.assertTrue(any("longueur" in a for a in out))
        self.assertTrue(any("manquante" in a for a in out))

    def test_series_au_dela_de_l_instantane(self):
        def later(e):
            e["months"][-1] = "2026-09"
        self.mutate("tenure_cohort.json", later)
        out = self.mutate("ecosystem_mix.json", later)
        self.assertTrue(any("au-delà" in a for a in out))

    def test_lot_publie_actuel_anomalies_connues(self):
        """Documente les écarts du lot publié (20260419T130333), signalés au propriétaire."""
        out = consistency_anomalies(DATA)
        self.assertEqual(validate_output_dir(DATA), [])
        self.assertTrue(any(a.startswith("headline.countries=38") for a in out))
        self.assertTrue(any(a.startswith("headline.devs_active_28d=4283") for a in out))
        self.assertTrue(any("pipeline_version" in a for a in out))


if __name__ == "__main__":
    unittest.main()


class StricterConsistencyTests(unittest.TestCase):
    """Doublons, ordre des mois, date future, ville hors périmètre."""

    def setUp(self):
        import shutil
        import tempfile

        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: shutil.rmtree(self.tmp))
        for f in DATA.iterdir():
            if f.suffix == ".json":
                shutil.copy(f, self.tmp / f.name)

    def edit(self, name, fn):
        p = self.tmp / name
        obj = json.loads(p.read_text())
        fn(obj)
        p.write_text(json.dumps(obj))

    def problems(self):
        from validate import consistency_anomalies

        return " | ".join(consistency_anomalies(self.tmp))

    def test_duplicate_city(self):
        self.edit("top_cities.json", lambda c: c.append(dict(c[0])))
        self.assertIn("doublon", self.problems())

    def test_city_outside_country_map(self):
        self.edit("top_cities.json", lambda c: c[0].update(iso_a3="ZZZ"))
        self.assertIn("pays absent", self.problems())

    def test_months_out_of_order(self):
        self.edit("tenure_cohort.json", lambda c: c["months"].reverse())
        self.assertIn("mois non strictement croissants", self.problems())

    def test_future_snapshot(self):
        self.edit("headline.json", lambda h: h.update(snapshot_date="2999-01-01"))
        self.assertIn("futur", self.problems())

    def test_invalid_fingerprint(self):
        self.edit("meta.json", lambda m: m.update(source_fingerprint="xyz"))
        self.assertIn("source_fingerprint invalide", self.problems())
