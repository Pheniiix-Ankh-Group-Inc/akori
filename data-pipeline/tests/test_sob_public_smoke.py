"""Offline verification of public State of BIB smoke tests."""
import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[2] / "scripts" / "verify_sob_public.py"
spec = importlib.util.spec_from_file_location("verify_sob_public", path)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class PublicSobTests(unittest.TestCase):
    def test_report_requires_visible_kpi_and_actual_version(self):
        html = '<h2 id="sob-headline" class="sob-hero-number">1 525</h2><dl class="sob-facts"><div><dt>Date</dt><dd>Nov 12</dd></div><div><dt>Version</dt><dd>20261120T130142</dd></div></dl>'
        self.assertEqual(smoke.check_report(html, "20261120T130142"), 1525)
        with self.assertRaises(smoke.PublicSobFailure):
            smoke.check_report(html, "20261118T130441")

    def test_report_refuses_version_only_in_select_and_empty_kpi(self):
        raw = '<option value="20261120T130142">latest</option><h2 id="sob-headline">--</h2>'
        with self.assertRaises(smoke.PublicSobFailure):
            smoke.check_report(raw, "20261120T130142")

    def test_home_requires_five_visible_kpis(self):
        page = '<section aria-labelledby="home-sob"><div class="ed-stats">' + ''.join(f'<strong>{i}</strong>' for i in range(1, 6)) + '</div></section>'
        smoke.check_home(page)
        with self.assertRaises(smoke.PublicSobFailure):
            smoke.check_home('<section aria-labelledby="home-sob"><div class="ed-stats"></div></section>')

    def test_https_origin_is_required(self):
        self.assertEqual(smoke.canonical("https://www.anbachain.org/"), "https://www.anbachain.org")
        for bad in ("http://www.anbachain.org", "https://www.anbachain.org/stuff", "https://user@evil.net/"):
            with self.subTest(bad=bad), self.assertRaises(smoke.PublicSobFailure):
                smoke.canonical(bad)


if __name__ == "__main__":
    unittest.main()
