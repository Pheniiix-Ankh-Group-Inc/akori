"""Historical snapshots: safe dry-run, duplicate detection, unchanged source content."""
import io
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import backfill_history as bh  # noqa: E402

SOURCE = HERE.parent.parent / "data" / "state-of-bib" / "current"


class HistoricalBackfillTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.current = self.root / "current"
        self.hist = self.root / "history"
        self.hist.mkdir()
        shutil.copytree(SOURCE, self.current)
        shutil.copytree(SOURCE, self.hist / "legacy")

    def test_identical_versions_are_deduplicated_without_writes(self):
        versions = bh.snapshot_versions(self.hist, self.current)
        self.assertEqual(len(versions), 1)
        self.assertEqual(versions[0][0], "20260419T130333")
        self.assertEqual(len(bh.validate_archive(versions[0][1])), 6)

    def test_divergent_same_version_is_refused(self):
        p = self.current / "headline.json"
        payload = json.loads(p.read_text())
        payload["devs_active_28d"] += 1
        p.write_text(json.dumps(payload))
        with self.assertRaisesRegex(ValueError, "different contents"):
            bh.snapshot_versions(self.hist, self.current)

    def test_rebuild_deltas_when_historical_version_arrives_after_current(self):
        from fake_supabase import FakeSupabase
        sb = FakeSupabase()
        old = sb.insert("dataset_versions", {
            "source_id": "electric-capital-osdd", "provider_version": "old",
            "status": "superseded", "as_of_date": "2026-04-18",
        })[0]
        current = sb.insert("dataset_versions", {
            "source_id": "electric-capital-osdd", "provider_version": "new",
            "status": "published", "is_current": True, "as_of_date": "2026-11-09",
        })[0]
        for version, value, date in [(old, 100, "2026-04-18"), (current, 160, "2026-11-09")]:
            sb.insert("metric_observations", {
                "dataset_version_id": version["id"], "metric_key": "devs_active_28d",
                "dimension_type": "total", "dimension_value": "", "period_start": None,
                "as_of_date": date, "value": value,
            })
        self.assertEqual(bh.rebuild_deltas(sb), 1)
        rows = sb.t["dataset_version_deltas"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["previous_value"], 100)
        self.assertEqual(rows[0]["current_value"], 160)
        self.assertEqual(rows[0]["delta"], 60)
        self.assertEqual(bh.rebuild_deltas(sb), 1)
        self.assertEqual(len(sb.t["dataset_version_deltas"]), 1)
        self.assertTrue(sb.current()["is_current"])

    def test_default_command_is_preview_only(self):
        original = bh.snapshot_versions
        try:
            bh.snapshot_versions = lambda: bh.snapshot_versions(self.hist, self.current) if False else [("v1", self.current)]
            result = io.StringIO()
            with redirect_stdout(result):
                self.assertEqual(bh.main([]), 0)
            self.assertIn("PREVIEW ONLY", result.getvalue())
        finally:
            bh.snapshot_versions = original


if __name__ == "__main__":
    unittest.main()
