"""Tests du pipeline State of BIB (sans réseau, faux client Supabase).

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

import publish_supabase as ps  # noqa: E402

DATA = HERE.parent.parent / "public" / "data"


class FakeSupabase:
    """Enregistre les appels ; simule juste assez de PostgREST/Storage."""

    def __init__(self, versions: list[dict] | None = None):
        self.calls: list[tuple] = []
        self.versions = versions or []

    def select(self, table, params):
        self.calls.append(("select", table))
        if table == "dataset_versions":
            v = params.get("provider_version", "").removeprefix("eq.")
            return [r for r in self.versions if r["provider_version"] == v]
        return []

    def insert(self, table, rows, **kw):
        self.calls.append(("insert", table))
        if table == "dataset_versions":
            row = {**rows, "id": "v-1", "status": rows.get("status")}
            self.versions.append(row)
            return [row]
        if table == "ingestion_runs":
            return [{"id": "run-1"}]
        return []

    def update(self, table, match, values):
        self.calls.append(("update", table, values.get("status")))

    def upload(self, bucket, path, content, content_type):
        self.calls.append(("upload", bucket, path))
        return True

    def rpc(self, fn, args):
        self.calls.append(("rpc", fn, args))
        return "published"


class GovernanceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        for name in ps.REQUIRED:
            shutil.copy(DATA / name, self.tmp / name)
        self.version = str(json.loads((self.tmp / "meta.json").read_text())["dataset_version"])

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_manifest_is_deterministic_and_complete(self):
        files = ps.load_files(self.tmp)
        m1, m2 = ps.artifact_manifest(files), ps.artifact_manifest(dict(reversed(list(files.items()))))
        self.assertEqual(m1, m2)
        self.assertEqual({a["name"] for a in m1}, set(ps.REQUIRED))
        self.assertTrue(all(len(a["sha256"]) == 64 for a in m1))

    def test_stage_never_publishes_and_uses_private_bucket(self):
        sb = FakeSupabase()
        self.assertEqual(ps.stage(sb, self.tmp), 0)
        rpcs = [c for c in sb.calls if c[0] == "rpc"]
        self.assertEqual(rpcs, [], "la préparation ne doit appeler aucune fonction de publication")
        buckets = {c[1] for c in sb.calls if c[0] == "upload"}
        self.assertEqual(buckets, {ps.CANDIDATE_BUCKET})
        self.assertIn(("update", "dataset_versions", "validated"), sb.calls)

    def test_stage_skips_existing_candidate(self):
        sb = FakeSupabase([{"id": "v-1", "provider_version": self.version, "status": "validated", "is_current": False}])
        self.assertEqual(ps.stage(sb, self.tmp), 0)
        self.assertFalse(any(c[0] == "upload" for c in sb.calls))

    def test_stage_refuses_invalid_data(self):
        (self.tmp / "headline.json").write_text("{}")
        with self.assertRaises(ValueError):
            ps.stage(FakeSupabase(), self.tmp)

    def test_promote_requires_commit_and_candidate(self):
        with self.assertRaises(ValueError):
            ps.promote(FakeSupabase(), self.tmp, "main")
        self.assertEqual(ps.promote(FakeSupabase(), self.tmp, "a" * 40), 2)

    def test_promote_uploads_approved_files_before_switching(self):
        sb = FakeSupabase([{"id": "v-1", "provider_version": self.version, "status": "validated", "is_current": False}])
        self.assertEqual(ps.promote(sb, self.tmp, "b" * 40), 0)
        kinds = [c[0] for c in sb.calls]
        last_upload = max(i for i, k in enumerate(kinds) if k == "upload")
        rpc_index = kinds.index("rpc")
        self.assertLess(last_upload, rpc_index, "les fichiers publics doivent exister avant la bascule")
        fn, args = sb.calls[rpc_index][1], sb.calls[rpc_index][2]
        self.assertEqual(fn, "promote_dataset_version")
        self.assertEqual(args["p_commit_sha"], "b" * 40)
        self.assertEqual(args["p_artifacts"], ps.artifact_manifest(ps.load_files(self.tmp)))
        self.assertEqual({c[1] for c in sb.calls if c[0] == "upload"}, {ps.PUBLIC_BUCKET})

    def test_sync_disabled_is_a_noop(self):
        import os
        os.environ.pop("SOB_SUPABASE_SYNC", None)
        self.assertEqual(ps.main(["stage"]), 0)


class CheckVersionTest(unittest.TestCase):
    def test_version_pattern(self):
        import check_version as cv
        self.assertTrue(cv.VERSION_RE.match("2026-11-01"))
        self.assertTrue(cv.VERSION_RE.match("v1.2.3"))
        self.assertFalse(cv.VERSION_RE.match("../../etc"))
        self.assertFalse(cv.VERSION_RE.match("x" * 65))


if __name__ == "__main__":
    unittest.main()
