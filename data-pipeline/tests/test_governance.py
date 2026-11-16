"""Tests du pipeline State of BIB : manifeste, détection, réconciliation.

Aucun réseau : manifeste et Supabase sont simulés.
python -m unittest discover -s data-pipeline/tests -v
"""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import check_version as cv  # noqa: E402
import publish_supabase as ps  # noqa: E402
import source_manifest as sm  # noqa: E402

DATA = HERE.parent.parent / "data" / "state-of-bib" / "current"


def manifest(version="20261119T124952", size=100, b3="aa", extra=None, absolute=False):
    res = []
    for t in sm.SOB_TABLES:
        path = f"/snapshots/{version}/{t}.parquet"
        if absolute:
            path = f"https://data.developerreport.com{path}"
        res.append({"path": path, "size_bytes": size, "b3sum": b3})
    res.append({"path": f"/snapshots/{version}/unused_table.parquet", "size_bytes": 5, "b3sum": "zz"})
    return {"dataset": {"version": version, "resources": res + (extra or [])}}


class ManifestTest(unittest.TestCase):
    def test_urls_come_from_the_manifest(self):
        res = sm.table_resources(manifest(), sm.SOB_TABLES)
        self.assertEqual(set(res), set(sm.SOB_TABLES))
        self.assertEqual(res["ecosystems"]["url"], "https://data.opendevdata.org/snapshots/20261119T124952/ecosystems.parquet")
        abs_res = sm.table_resources(manifest(absolute=True), sm.SOB_TABLES)
        self.assertTrue(abs_res["ecosystems"]["url"].startswith("https://data.developerreport.com/"))

    def test_unexpected_host_or_scheme_is_refused(self):
        bad = manifest(extra=[])
        bad["dataset"]["resources"][0]["path"] = "https://evil.example/ecosystems.parquet"
        with self.assertRaises(sm.ManifestError):
            sm.table_resources(bad, sm.SOB_TABLES)
        bad["dataset"]["resources"][0]["path"] = "http://data.opendevdata.org/ecosystems.parquet"
        with self.assertRaises(sm.ManifestError):
            sm.table_resources(bad, sm.SOB_TABLES)

    def test_missing_or_duplicated_table_is_an_error(self):
        m = manifest()
        m["dataset"]["resources"] = m["dataset"]["resources"][1:]
        with self.assertRaises(sm.ManifestError):
            sm.table_resources(m, sm.SOB_TABLES)
        dup = manifest(extra=[{"path": "/other/ecosystems.parquet"}])
        with self.assertRaises(sm.ManifestError):
            sm.table_resources(dup, sm.SOB_TABLES)

    def test_invalid_manifest(self):
        for raw in (b"not json", b"{}", b'{"dataset":{"version":"../x","resources":[{"path":"a"}]}}',
                    b'{"dataset":{"version":"v1","resources":[]}}'):
            with self.assertRaises(sm.ManifestError):
                sm.parse_manifest(raw)

    def test_fingerprint_detects_a_silent_correction(self):
        base = sm.fingerprint(manifest(), sm.SOB_TABLES)
        self.assertEqual(base, sm.fingerprint(manifest(), sm.SOB_TABLES))
        self.assertNotEqual(base, sm.fingerprint(manifest(b3="bb"), sm.SOB_TABLES))
        self.assertNotEqual(base, sm.fingerprint(manifest(size=101), sm.SOB_TABLES))
        # Une ressource non utilisée ne déclenche pas de reconstruction.
        self.assertEqual(base, sm.fingerprint(manifest(extra=[{"path": "/x/other.parquet", "size_bytes": 1}]), sm.SOB_TABLES))

    def test_unreachable_manifest_and_resource(self):
        session = mock.Mock()
        session.get.return_value = mock.Mock(status_code=503, content=b"")
        with self.assertRaises(sm.ManifestError):
            sm.fetch_manifest(session)
        res = sm.table_resources(manifest(), sm.SOB_TABLES)
        session.head.return_value = mock.Mock(status_code=404, headers={})
        self.assertEqual(len(sm.verify_resources(res, session)), len(sm.SOB_TABLES))
        session.head.return_value = mock.Mock(status_code=200, headers={"content-length": "99"})
        self.assertTrue(all("taille" in p for p in sm.verify_resources(res, session)))
        session.head.return_value = mock.Mock(status_code=200, headers={"content-length": "100"})
        self.assertEqual(sm.verify_resources(res, session), [])


class DecisionTest(unittest.TestCase):
    FP = "a" * 64

    def test_new_version(self):
        self.assertEqual(cv.decide("v2", self.FP, []), (True, "v2", "nouvelle version"))

    def test_no_new_version(self):
        rows = [{"provider_version": "v2", "status": "published", "source_fingerprint": self.FP}]
        needs, version, _ = cv.decide("v2", self.FP, rows)
        self.assertEqual((needs, version), (False, "v2"))

    def test_correction_of_an_existing_version(self):
        rows = [{"provider_version": "v2", "status": "published", "source_fingerprint": "b" * 64}]
        needs, version, reason = cv.decide("v2", self.FP, rows)
        self.assertEqual((needs, version), (True, "v2-r2"))
        self.assertIn("correction", reason)
        rows.append({"provider_version": "v2-r2", "status": "published", "source_fingerprint": "c" * 64})
        self.assertEqual(cv.decide("v2", self.FP, rows)[1], "v2-r3")

    def test_known_correction_is_not_rebuilt(self):
        rows = [{"provider_version": "v2", "status": "superseded", "source_fingerprint": "b" * 64},
                {"provider_version": "v2-r2", "status": "validated", "source_fingerprint": self.FP}]
        self.assertEqual(cv.decide("v2", self.FP, rows)[:2], (False, "v2-r2"))

    def test_failed_version_is_retried_then_needs_a_human(self):
        rows = [{"provider_version": "v2", "status": "failed", "source_fingerprint": self.FP}]
        self.assertTrue(cv.decide("v2", self.FP, rows, failed_builds=1)[0])
        needs, _, reason = cv.decide("v2", self.FP, rows, failed_builds=cv.MAX_FAILED_ATTEMPTS)
        self.assertFalse(needs)
        self.assertIn("nouvelle tentative après correction", reason)

    def test_legacy_row_without_fingerprint_is_not_treated_as_a_correction(self):
        rows = [{"provider_version": "v2", "status": "published", "source_fingerprint": None}]
        self.assertFalse(cv.decide("v2", self.FP, rows)[0])


class FakeStore:
    """Supabase simulé : version courante, artefacts et objets Storage."""

    def __init__(self, files: dict[str, bytes], tamper: str | None = None, missing: str | None = None):
        self.objects = {f"versions/v9/{n}": c for n, c in files.items()}
        self.artifacts = [{"name": n, "storage_path": f"versions/v9/{n}", "sha256": hashlib.sha256(c).hexdigest()} for n, c in files.items()]
        if tamper:
            self.objects[f"versions/v9/{tamper}"] = b"{}"
        if missing:
            del self.objects[f"versions/v9/{missing}"]
        self.inserts: list[tuple[str, dict]] = []
        self.rpcs: list[str] = []

    def select(self, table, params):
        if table == "dataset_versions" and params.get("is_current") == "eq.true":
            return [{"id": "cur", "provider_version": "v9", "published_at": "x", "dataset_artifacts": self.artifacts}]
        if table == "dataset_versions":
            return [{"id": "old", "status": "superseded", "is_current": False}]
        return []

    def download(self, bucket, path):
        assert bucket == ps.CANDIDATE_BUCKET
        return self.objects.get(path)

    def insert(self, table, row, **kw):
        self.inserts.append((table, row))
        return []

    def rpc(self, fn, args):
        self.rpcs.append(fn)
        return "restored"


class ReconcileTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.files = {n: (DATA / n).read_bytes() for n in ps.REQUIRED}

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def write_repo(self):
        for n, c in self.files.items():
            (self.tmp / n).write_bytes(c)

    def test_in_sync(self):
        self.write_repo()
        sb = FakeStore(self.files)
        self.assertEqual(ps.reconcile(sb, self.tmp), 0)
        run = [r for t, r in sb.inserts if t == "ingestion_runs"][0]
        self.assertEqual((run["kind"], run["status"], run["details"]["state"]), ("reconcile", "succeeded", "in_sync"))
        self.assertFalse([t for t, _ in sb.inserts if t == "ops_incidents"])

    def test_repo_behind_is_detected_not_hidden(self):
        self.write_repo()
        (self.tmp / "headline.json").write_text("{}")
        sb = FakeStore(self.files)
        self.assertEqual(ps.reconcile(sb, self.tmp), 3)
        self.assertEqual([r for t, r in sb.inserts if t == "ingestion_runs"][0]["details"]["repo"], ["headline.json"])

    def test_storage_mismatch_is_a_critical_incident(self):
        self.write_repo()
        for kw in ({"tamper": "country_map.json"}, {"missing": "meta.json"}):
            sb = FakeStore(self.files, **kw)
            self.assertEqual(ps.reconcile(sb, self.tmp), 1)
            self.assertEqual([r for t, r in sb.inserts if t == "ops_incidents"][0]["severity"], "critical")
            self.assertEqual([r for t, r in sb.inserts if t == "ingestion_runs"][0]["status"], "failed")

    def test_export_writes_verified_artifacts_only(self):
        self.assertEqual(ps.export_current(FakeStore(self.files), self.tmp), 0)
        self.assertEqual({p.name for p in self.tmp.iterdir()}, set(ps.REQUIRED))
        self.assertEqual((self.tmp / "meta.json").read_bytes(), self.files["meta.json"])
        other = Path(tempfile.mkdtemp())
        try:
            self.assertEqual(ps.export_current(FakeStore(self.files, tamper="meta.json"), other), 1)
            self.assertEqual(list(other.iterdir()), [], "aucun fichier écrit si une empreinte diffère")
        finally:
            shutil.rmtree(other)

    def test_rollback_uses_the_restore_rpc(self):
        sb = FakeStore(self.files)
        self.assertEqual(ps.rollback(sb, "v8"), 0)
        self.assertEqual(sb.rpcs, ["restore_dataset_version"])

    def test_sync_disabled_is_a_noop(self):
        # Essai local explicitement autorisé : aucune écriture, code 0.
        with mock.patch.dict("os.environ", {"SOB_SUPABASE_SYNC": "", "SOB_ALLOW_NO_SYNC": "true"}):
            self.assertEqual(ps.main(["ingest"]), 0)
        # Exécution automatisée sans configuration : jamais un faux succès.
        with mock.patch.dict("os.environ", {"SOB_SUPABASE_SYNC": "", "SOB_ALLOW_NO_SYNC": ""}):
            self.assertEqual(ps.main(["ingest"]), 78)

    def test_no_public_bucket_and_no_legacy_commands(self):
        source = (HERE.parent / "publish_supabase.py").read_text()
        self.assertNotIn("bib-sob-snapshots", source)
        for legacy in ("def promote", "def stage", "promote_dataset_version"):
            self.assertNotIn(legacy, source)


if __name__ == "__main__":
    unittest.main()
