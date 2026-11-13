"""check_version.py — vérification quotidienne LÉGÈRE d'une nouvelle version source.

Ne télécharge aucun Parquet : lit seulement le manifeste Electric Capital et
compare avec la dernière version traitée. Décide si le traitement lourd
(build_data.py) doit être lancé :
    · nouvelle version disponible, ou
    · version déjà détectée mais dont le traitement précédent a échoué
      (reprise, si Supabase est configuré).

Sorties (GITHUB_OUTPUT si présent, sinon stdout) :
    needs_build=true|false
    version=<provider_version>
    reason=<texte>

Variables :
    SOB_SUPABASE_SYNC=true + SUPABASE_URL + SUPABASE_SECRET_KEY → consulte et
    journalise aussi l'état dans Supabase (ingestion_runs). Sinon, la
    référence est public/data/meta.json.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

MANIFEST_URL = "https://data.opendevdata.org/manifest.json"
SOURCE_ID = "electric-capital-osdd"
META_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "meta.json"


def emit(**values: str) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    lines = [f"{k}={v}" for k, v in values.items()]
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


def local_version() -> str | None:
    try:
        return json.loads(META_PATH.read_text()).get("dataset_version")
    except (OSError, json.JSONDecodeError):
        return None


def main() -> int:
    r = requests.get(MANIFEST_URL, timeout=60)
    r.raise_for_status()
    remote = r.json()["dataset"]["version"]

    sync = os.environ.get("SOB_SUPABASE_SYNC", "").strip() == "true"
    if sync:
        from supabase_rest import SupabaseRest

        sb = SupabaseRest()
        rows = sb.select("dataset_versions", {
            "select": "id,status",
            "source_id": f"eq.{SOURCE_ID}",
            "provider_version": f"eq.{remote}",
            "limit": "1",
        })
        status = rows[0]["status"] if rows else None
        needs = status is None or status in ("detected", "processing", "failed", "validated")
        reason = "nouvelle version" if status is None else f"version connue (statut {status})"
        sb.insert("ingestion_runs", {
            "source_id": SOURCE_ID,
            "kind": "version_check",
            "trigger": "manual" if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch" else "schedule",
            "status": "succeeded",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "message": f"remote={remote} needs_build={needs}",
        }, returning=False)
    else:
        current = local_version()
        needs = current != remote
        reason = "nouvelle version" if needs else "déjà à jour (public/data/meta.json)"

    if os.environ.get("SOB_FORCE_BUILD", "").strip() == "true":
        needs, reason = True, "reconstruction forcée"

    emit(needs_build="true" if needs else "false", version=remote, reason=reason)
    return 0


if __name__ == "__main__":
    sys.exit(main())
