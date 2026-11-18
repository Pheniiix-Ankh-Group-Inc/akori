"""Tests d'acceptation du pipeline State of BIB entièrement automatique.

Scénarios A à F, J et K du cahier des charges (les scénarios G, H et I
concernent le site : tests/unit/sob-auto.test.ts). Supabase est simulé en
mémoire, aucun réseau.

    python -m unittest discover -s data-pipeline/tests -v
"""
from __future__ import annotations

import io
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

import check_version as cv  # noqa: E402
import publish_supabase as ps  # noqa: E402
from fake_supabase import FakeSupabase  # noqa: E402
from pipeline_version import PIPELINE_VERSION  # noqa: E402

DATA = HERE.parent.parent / "data" / "state-of-bib" / "current"


def make_lot(directory: Path, version: str, *, snapshot: str = "2026-10-28", scale: float = 1.0,
             verification: bool = True, mutate=None) -> Path:
    """Lot COHÉRENT de test, dérivé de la copie du dépôt : totaux recalculés à
    partir des pays, séries arrêtées au mois de l'instantané, recalcul
    indépendant renseigné. `scale` multiplie l'activité (forte variation réelle)."""
    directory.mkdir(parents=True, exist_ok=True)
    load = lambda n: json.loads((DATA / n).read_text())  # noqa: E731
    meta, headline, countries = load("meta.json"), load("headline.json"), load("country_map.json")
    cities, eco, cohort = load("top_cities.json"), load("ecosystem_mix.json"), load("tenure_cohort.json")
    for c in countries:
        c["devs_active_28d"] = int(round(c["devs_active_28d"] * scale))
        c["commits_lifetime"] = int(round(c["commits_lifetime"] * max(scale, 1.0)))
        c["commits_last_12m"] = min(c.get("commits_last_12m") or 0, c["commits_lifetime"])
    by_iso = {c["iso_a3"]: c["devs_active_28d"] for c in countries}
    kept, used = [], {}
    for c in cities:
        n = int(round(c["devs_active_28d"] * scale))
        if c["iso_a3"] in by_iso and used.get(c["iso_a3"], 0) + n <= by_iso[c["iso_a3"]]:
            used[c["iso_a3"]] = used.get(c["iso_a3"], 0) + n
            kept.append({**c, "devs_active_28d": n})
    kept.sort(key=lambda c: -c["devs_active_28d"])
    cities = [{**c, "rank": i + 1} for i, c in enumerate(kept)]
    headline.update(countries=len(countries), devs_active_28d=sum(by_iso.values()),
                    commits_lifetime=sum(c["commits_lifetime"] for c in countries), snapshot_date=snapshot)
    # Axe mensuel continu jusqu'au mois de l'instantané ; le dernier mois porte la variation.
    n = len(eco["months"])
    y, m = int(snapshot[:4]), int(snapshot[5:7])
    axis = []
    for _ in range(n):
        axis.append(f"{y:04d}-{m:02d}")
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    axis.reverse()
    eco["months"] = axis
    cohort["months"] = axis
    if scale != 1.0:
        for e in eco["ecosystems"]:
            e["series_devs"][-1] = int(round(e["series_devs"][-1] * scale))
        for k in ("devs_0_1y", "devs_1_2y", "devs_2y_plus"):
            cohort[k][-1] = int(round(cohort[k][-1] * scale))
    meta.update(dataset_version=version, source_version=version.split("-r")[0], pipeline_version=PIPELINE_VERSION,
                source_fingerprint=("a" if "-r" not in version else "b") * 64)
    if verification:
        meta["verification"] = {"devs_active_28d": headline["devs_active_28d"],
                                "commits_lifetime": headline["commits_lifetime"], "countries": headline["countries"]}
    else:
        meta.pop("verification", None)
    lot = {"meta.json": meta, "headline.json": headline, "country_map.json": countries,
           "top_cities.json": cities, "ecosystem_mix.json": eco, "tenure_cohort.json": cohort}
    if mutate:
        mutate(lot)
    for name, obj in lot.items():
        (directory / name).write_text(json.dumps(obj))
    return directory


def run(fn, *args):
    """Exécute en silence ; renvoie (code, sortie)."""
    buf = io.StringIO()
    with redirect_stdout(buf):
        code = fn(*args)
    return code, buf.getvalue()


class AcceptanceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: shutil.rmtree(self.tmp))
        self.sb = FakeSupabase("auto")

    def lot(self, version, **kw):
        return make_lot(self.tmp / version, version, **kw)

    def publish(self, version, **kw):
        code, out = run(ps.ingest, self.sb, self.lot(version, **kw))
        return code, out

    # ── Scénario J — base initialement vide ───────────────────────────
    def test_J_first_ingestion_on_an_empty_database_publishes_without_any_approval(self):
        self.assertEqual(self.sb.t["dataset_versions"], [])
        code, out = self.publish("v1")
        self.assertEqual(code, 0, out)
        cur = self.sb.current()
        self.assertEqual((cur["provider_version"], cur["status"]), ("v1", "published"))
        self.assertEqual(self.sb.rpcs, ["publish_dataset_candidate"])
        self.assertIn("publication vérifiée", out)
        # Rien n'attend une action humaine.
        self.assertFalse([v for v in self.sb.t["dataset_versions"] if v["status"] == "validated"])
        self.assertEqual(self.sb.incidents(), [])
        self.assertEqual(len([a for a in self.sb.t["dataset_artifacts"]]), 6)
        self.assertTrue(all(p.startswith("versions/v1/") and p.endswith(".json") for p in self.sb.objects))

    def test_J_missing_settings_row_defaults_to_automatic(self):
        sb = FakeSupabase(mode=None)
        self.assertEqual(ps.automation_mode(sb), "auto")

    # ── Scénario A — nouvelle version ─────────────────────────────────
    def test_A_new_version_is_ingested_and_published_automatically(self):
        self.publish("v1")
        code, out = self.publish("v2", snapshot="2026-11-04")
        self.assertEqual(code, 0, out)
        self.assertEqual(self.sb.current()["provider_version"], "v2")
        self.assertEqual(self.sb.version("v1")["status"], "superseded")
        # Historique préservé : observations des deux versions.
        ids = {o["dataset_version_id"] for o in self.sb.t["metric_observations"]}
        self.assertEqual(ids, {self.sb.version("v1")["id"], self.sb.version("v2")["id"]})
        self.assertEqual(len([v for v in self.sb.t["dataset_versions"] if v["is_current"]]), 1)
        last = [r for r in self.sb.t["ingestion_runs"] if r["kind"] == "build"][-1]
        self.assertEqual(last["status"], "succeeded")
        self.assertIn("publiée et vérifiée", last["message"])

    # ── Scénario B — aucune nouvelle donnée ───────────────────────────
    def test_B_unchanged_manifest_triggers_no_heavy_processing(self):
        self.publish("v1")
        row = self.sb.version("v1")
        needs, version, reason = cv.decide("v1", "a" * 64, [dict(row)])
        self.assertFalse(needs)
        self.assertIn("version connue", reason)

    # ── Scénario C — correction sous le même numéro ───────────────────
    def test_C_same_version_number_with_new_content_becomes_a_revision(self):
        self.publish("v1")
        needs, version, reason = cv.decide("v1", "b" * 64, [dict(self.sb.version("v1"))])
        self.assertEqual((needs, version), (True, "v1-r2"))
        code, out = self.publish("v1-r2", snapshot="2026-10-28")
        self.assertEqual(code, 0, out)
        self.assertEqual(self.sb.current()["provider_version"], "v1-r2")
        self.assertEqual(self.sb.version("v1")["status"], "superseded")
        self.assertEqual(self.sb.version("v1-r2")["source_version"], "v1")
        # La révision est ensuite connue : plus de retraitement.
        rows = [dict(v) for v in self.sb.t["dataset_versions"]]
        self.assertFalse(cv.decide("v1", "b" * 64, rows)[0])

    # ── Scénario D — variation statistique importante ─────────────────
    def test_D_strong_variation_confirmed_by_reinforced_checks_is_published(self):
        self.publish("v1")
        code, out = self.publish("v2", snapshot="2026-11-11", scale=1.8)
        self.assertEqual(code, 0, out)
        v2 = self.sb.version("v2")
        report = v2["validation_report"]
        self.assertTrue(report["strong_variation"])
        self.assertIn("devs_active_28d", report["divergence"]["strong"])
        self.assertTrue(report["reinforced"]["passed"])
        self.assertEqual({c["name"] for c in report["reinforced"]["checks"]},
                         {"recalcul_independant", "agregats", "perimetre", "periodes", "vraisemblance", "repartition_pays", "historique"})
        self.assertEqual(self.sb.current()["provider_version"], "v2")
        self.assertIn("fortes variations enregistrées", v2["decision_note"])
        self.assertEqual(self.sb.incidents("sob.quarantine"), [])

    def test_D_strong_variation_is_recorded_even_without_independent_recalculation(self):
        self.publish("v1")
        code, out = self.publish("v2", snapshot="2026-11-11", scale=1.8, verification=False)
        self.assertEqual(code, 0, out)
        report = self.sb.version("v2")["validation_report"]
        self.assertTrue(report["strong_variation"])
        self.assertFalse(report["reinforced"]["passed"])
        self.assertEqual(self.sb.current()["provider_version"], "v2")
        self.assertEqual(self.sb.incidents("sob.quarantine"), [])

    def test_D_large_changes_and_rewritten_history_are_retained(self):
        self.publish("v1")
        code, out = self.publish("v2", snapshot="2026-11-11", scale=15)
        self.assertEqual(code, 0, out)
        self.assertTrue(self.sb.version("v2")["validation_report"]["strong_variation"])

        def rewrite(lot):
            for e in lot["ecosystem_mix.json"]["ecosystems"]:
                e["series_devs"] = [v * 3 for v in e["series_devs"]]

        code, out = self.publish("v3", snapshot="2026-11-12", scale=1.8, mutate=rewrite)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.sb.current()["provider_version"], "v3")
        self.assertTrue(self.sb.version("v3")["validation_report"]["consistency_anomalies"] or
                        self.sb.version("v3")["validation_report"]["reinforced"])

    def test_E_statistical_discrepancy_is_stored_without_changing_source(self):
        self.publish("v1")

        def break_totals(lot):
            lot["headline.json"]["devs_active_28d"] += 7

        code, out = self.publish("v2", snapshot="2026-11-04", mutate=break_totals)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.sb.current()["provider_version"], "v2")
        self.assertTrue(self.sb.version("v2")["validation_report"]["consistency_anomalies"])
        self.assertTrue(any(x.startswith("versions/v2/") for x in self.sb.objects))

    def test_E_historical_repository_snapshot_is_archived_without_publication(self):
        raw = self.tmp / "raw"
        shutil.copytree(DATA, raw)
        code = ps.ingest(self.sb, raw, historical=True)
        self.assertEqual(code, 0)
        self.assertIsNone(self.sb.current())
        self.assertEqual(self.sb.version("20260419T130333")["status"], "superseded")
        self.assertTrue(self.sb.version("20260419T130333")["validation_report"]["historical_import"])

    def test_E_tampered_storage_is_detected_after_publication_and_rolled_back(self):
        self.publish("v1")
        self.sb.tamper_after_upload = "headline.json"
        code, out = self.publish("v2", snapshot="2026-11-04")
        self.assertEqual(code, 1)
        self.assertEqual(self.sb.current()["provider_version"], "v1", "retour automatique à la dernière version intègre")
        self.assertEqual(self.sb.incidents("sob.desync")[0]["severity"], "critical")
        self.assertEqual(self.sb.rpcs, ["publish_dataset_candidate", "publish_dataset_candidate", "restore_dataset_version"])

    # ── Scénario F — dépôt GitHub en retard ───────────────────────────
    def test_F_repo_behind_supabase_is_reconciled_without_blocking_publication(self):
        self.publish("v1")
        repo = self.tmp / "repo"
        shutil.copytree(DATA, repo)  # copie du dépôt : ancienne
        code, out = run(ps.reconcile, self.sb, repo)
        self.assertEqual(code, 3, "dépôt en retard : signalé, pas une erreur de publication")
        self.assertEqual(self.sb.current()["provider_version"], "v1", "la version publiée ne dépend pas du dépôt")
        code, _ = run(ps.export_current, self.sb, repo)
        self.assertEqual(code, 0)
        self.assertEqual(json.loads((repo / "meta.json").read_text())["dataset_version"], "v1")
        code, _ = run(ps.reconcile, self.sb, repo)
        self.assertEqual(code, 0)
        states = [r["details"]["state"] for r in self.sb.t["ingestion_runs"] if r["kind"] == "reconcile"]
        self.assertEqual(states, ["repo_behind", "in_sync"])

    # ── Scénario K — relance ──────────────────────────────────────────
    def test_K_rerunning_the_same_version_never_duplicates_or_republishes(self):
        for _ in range(3):
            code, out = self.publish("v1")
            self.assertEqual(code, 0, out)
        self.assertEqual(len(self.sb.t["dataset_versions"]), 1)
        self.assertEqual(len(self.sb.t["dataset_artifacts"]), 6)
        self.assertEqual(self.sb.rpcs, ["publish_dataset_candidate"])
        self.assertEqual(len([v for v in self.sb.t["dataset_versions"] if v["is_current"]]), 1)
        n_obs = len(self.sb.t["metric_observations"])
        self.publish("v1")
        self.assertEqual(len(self.sb.t["metric_observations"]), n_obs)

    def test_K_older_data_never_replaces_the_current_version(self):
        self.publish("v2", snapshot="2026-11-04")
        code, out = self.publish("v1", snapshot="2026-10-28")
        self.assertEqual(code, 1)
        self.assertEqual(self.sb.current()["provider_version"], "v2")
        self.assertEqual(len(self.sb.incidents("sob.publish_refused")), 1)

    def test_K_concurrent_build_is_refused_by_the_run_lock(self):
        self.sb.insert("ingestion_runs", {"source_id": ps.SOURCE_ID, "kind": "build", "status": "running", "trigger": "schedule"})
        with self.assertRaises(ps.SupabaseError):
            run(ps.ingest, self.sb, self.lot("v1"))
        self.assertIsNone(self.sb.current())

    # ── Candidate laissée en attente (ancien mode review) ─────────────
    def test_pending_selection_uses_existing_detection_timestamp_column(self):
        # Dataset versions use detected_at, not created_at. A false in-memory
        # column would be tolerated by the FakeSupabase but rejected by PostgREST.
        from pathlib import Path
        source = (Path(__file__).resolve().parent.parent / "publish_supabase.py").read_text()
        self.assertIn("as_of_date.desc,detected_at.desc", source)
        self.assertNotIn("as_of_date.desc,created_at.desc", source)

    def test_pending_candidate_from_review_mode_is_published_once_auto_is_enabled(self):
        self.sb.t["automation_settings"][0]["mode"] = "review"
        code, out = self.publish("v1")
        self.assertEqual(code, 0)
        self.assertEqual(self.sb.version("v1")["status"], "validated")
        self.assertIsNone(self.sb.current())
        code, _ = run(ps.publish_pending, self.sb)
        self.assertEqual(code, 0)
        self.assertIsNone(self.sb.current(), "mode review : rien n'est publié automatiquement")
        self.sb.t["automation_settings"][0]["mode"] = "auto"
        code, out = run(ps.publish_pending, self.sb)
        self.assertEqual(code, 0, out)
        self.assertEqual(self.sb.current()["provider_version"], "v1")
        code, _ = run(ps.publish_pending, self.sb)
        self.assertEqual(code, 0)
        self.assertEqual(self.sb.rpcs.count("publish_dataset_candidate"), 1)

    def test_optional_paused_mode_only_collects(self):
        self.sb.t["automation_settings"][0]["mode"] = "paused"
        code, _ = self.publish("v1")
        self.assertEqual(code, 0)
        self.assertIsNone(self.sb.current())
        self.assertEqual(self.sb.rpcs, [])

    # ── Configuration ─────────────────────────────────────────────────
    def test_missing_configuration_is_never_a_silent_success(self):
        import os
        from unittest import mock

        with mock.patch.dict(os.environ, {"SOB_SUPABASE_SYNC": ""}, clear=False):
            code, out = run(ps.main, ["ingest"])
        self.assertEqual(code, 78)
        self.assertIn("aucune écriture", out)
        with mock.patch.dict(os.environ, {"SOB_SUPABASE_SYNC": "", "SOB_ALLOW_NO_SYNC": "true"}, clear=False):
            self.assertEqual(run(ps.main, ["ingest"])[0], 0)


class CheckCadenceTest(unittest.TestCase):
    def test_interval_is_configurable(self):
        now = datetime(2026, 11, 15, 12, 7, tzinfo=timezone.utc)
        self.assertTrue(cv.interval_elapsed(None, now, 6))
        self.assertTrue(cv.interval_elapsed(now - timedelta(minutes=55), now, 1), "horaire : chaque exécution vérifie")
        self.assertFalse(cv.interval_elapsed(now - timedelta(hours=2), now, 6))
        self.assertTrue(cv.interval_elapsed(now - timedelta(hours=5, minutes=55), now, 6))

    def test_failed_version_is_retried_then_waits_for_a_change(self):
        row = {"provider_version": "v1", "status": "failed", "source_fingerprint": "a" * 64, "pipeline_version": PIPELINE_VERSION}
        self.assertTrue(cv.decide("v1", "a" * 64, [row], failed_builds=1)[0])
        self.assertFalse(cv.decide("v1", "a" * 64, [row], failed_builds=cv.MAX_FAILED_ATTEMPTS)[0])
        # Un échec persistant ne bloque pas la détection des versions suivantes.
        self.assertEqual(cv.decide("v2", "c" * 64, [])[:2], (True, "v2"))
        self.assertTrue(cv.decide("v1", "a" * 64, [{**row, "pipeline_version": "ancien"}], failed_builds=99)[0])

    def test_validated_candidate_is_published_without_rebuilding(self):
        row = {"provider_version": "v1", "status": "validated", "source_fingerprint": "a" * 64}
        needs, _, reason = cv.decide("v1", "a" * 64, [row])
        self.assertFalse(needs)
        self.assertIn("publish-pending", reason)


if __name__ == "__main__":
    unittest.main()
