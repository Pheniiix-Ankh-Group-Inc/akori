"""Regressions for optional GitHub Actions variables forwarded as empty strings.

GitHub ${{ vars.NAME }} expands to an empty string when a variable is unset;
both pipeline CLI modules must remain importable before any data processing.
These tests deliberately use child interpreters so module-level configuration
is evaluated anew with each set of environment variables.
"""

from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parents[1]
VARS = (
    "SOB_MAX_FAILED_ATTEMPTS",
    "SOB_MAX_BLOCKED_ATTEMPTS",
    "SOB_BLOCKED_RETRY_HOURS",
    "SOB_STRONG_VARIATION",
)
VALUES = (
    "MAX_FAILED_ATTEMPTS",
    "MAX_BLOCKED_ATTEMPTS",
    "BLOCKED_RETRY_HOURS",
    "REVIEW_DIVERGENCE",
)
CODE = (
    "import check_version, publish_supabase; "
    "print(check_version.MAX_FAILED_ATTEMPTS, "
    "check_version.MAX_BLOCKED_ATTEMPTS, "
    "check_version.BLOCKED_RETRY_HOURS, "
    "publish_supabase.REVIEW_DIVERGENCE)"
)


class GitHubActionsEnvDefaultsTests(unittest.TestCase):
    def run_import(self, overrides: dict[str, str] | None) -> str:
        env = dict(os.environ)
        for name in VARS:
            env.pop(name, None)
        if overrides is not None:
            env.update(overrides)
        result = subprocess.run(
            [sys.executable, "-c", CODE],
            cwd=PIPELINE_DIR,
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def test_absent_optional_variables_use_safe_defaults(self):
        self.assertEqual(self.run_import(None), "3 5 24.0 0.5")

    def test_empty_optional_variables_use_safe_defaults(self):
        self.assertEqual(self.run_import(dict.fromkeys(VARS, "")), "3 5 24.0 0.5")

    def test_explicit_optional_variables_override_defaults(self):
        self.assertEqual(
            self.run_import({
                "SOB_MAX_FAILED_ATTEMPTS": "4",
                "SOB_MAX_BLOCKED_ATTEMPTS": "6",
                "SOB_BLOCKED_RETRY_HOURS": "12",
                "SOB_STRONG_VARIATION": "0.65",
            }),
            "4 6 12.0 0.65",
        )


if __name__ == "__main__":
    unittest.main()
