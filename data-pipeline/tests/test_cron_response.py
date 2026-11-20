"""No-network tests for cron HTTP, explicit business statuses and redirects."""
import importlib.util
from pathlib import Path
import unittest

PATH = Path(__file__).resolve().parents[2] / "scripts" / "run_cron.py"
SPEC = importlib.util.spec_from_file_location("run_cron", PATH)
cron = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cron)


class CronResponseTests(unittest.TestCase):
    def test_canonical_url_and_security(self):
        self.assertEqual(cron.endpoint("https://www.anbachain.org/", "news"),
                         "https://www.anbachain.org/api/cron/news")
        self.assertEqual(cron.endpoint("https://www.anbachain.org", "newsletter", "send"),
                         "https://www.anbachain.org/api/cron/newsletter?step=send")
        for url in ("http://example.org", "https://site.test@evil.org",
                    "https://site.test/custom", "https://site.test/?x=1"):
            with self.subTest(url=url), self.assertRaises(cron.CronFailure):
                cron.endpoint(url, "news")

    def test_redirects_are_fatal_even_if_body_says_ok(self):
        with self.assertRaisesRegex(cron.CronFailure, "HTTP 307"):
            cron.verify("news", None, 307, {"ok": True, "report": {}})

    def test_missing_news_sources_and_disabled_feature_fail(self):
        with self.assertRaises(cron.CronFailure):
            cron.verify("news", None, 200, {"ok": True, "skipped": "news_ingest_disabled"})
        with self.assertRaises(cron.CronFailure):
            cron.verify("news", None, 200, {"ok": True, "report": {"sources": 0, "fetched": 0, "inserted": 0, "failures": []}})

    def test_news_dedup_is_success_but_fetch_errors_fail(self):
        good = {"ok": True, "report": {"sources": 2, "fetched": 20, "inserted": 0, "failures": []}}
        self.assertIn("2 sources", cron.verify("news", None, 200, good))
        good["report"]["failures"] = [{"source": "bad"}]
        with self.assertRaises(cron.CronFailure):
            cron.verify("news", None, 200, good)

    def test_newsletter_requires_right_step_and_terminal_status(self):
        self.assertEqual(cron.verify("newsletter", "generate", 200, {"ok": True, "result": {"step": "generate", "status": "drafted"}}),
                         "Newsletter generate: drafted")
        self.assertIn("not due", cron.verify("newsletter", "send", 200, {"ok": True, "result": {"step": "send", "status": "eligible", "detail": "créneau non atteint"}}))
        for state in ("blocked", "failed", "cancelled", "partially_sent"):
            with self.subTest(state=state), self.assertRaises(cron.CronFailure):
                cron.verify("newsletter", "send", 200, {"ok": True, "result": {"step": "send", "status": state}})
        with self.assertRaises(cron.CronFailure):
            cron.verify("newsletter", "send", 200, {"ok": True, "result": {"step": "check", "status": "sent"}})


if __name__ == "__main__":
    unittest.main()
