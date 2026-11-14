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
import re
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


VERSION_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
MAX_FAILED_ATTEMPTS = int(os.environ.get("SOB_MAX_FAILED_ATTEMPTS", "3"))


def fetch_remote_version() -> str:
    """Lit le manifeste (HTTPS, hôte attendu, taille bornée) et valide la version."""
    r = requests.get(MANIFEST_URL, timeout=60, allow_redirects=False)
    if r.status_code != 200:
        raise RuntimeError(f"manifeste indisponible (HTTP {r.status_code})")
    if len(r.content) > 1_000_000:
        raise RuntimeError("manifeste anormalement volumineux")
    version = str(r.json()["dataset"]["version"])
    if not VERSION_RE.match(version):
        raise RuntimeError(f"version de manifeste inattendue : {version!r}")
    return version


def main() -> int:
    remote = fetch_remote_version()

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
        # « validated » = candidate déjà préparée, en attente de revue : pas de
        # nouveau traitement lourd. Les échecs répétés exigent une intervention.
        needs = status is None or status in ("detected", "processing", "failed")
        reason = "nouvelle version" if status is None else f"version connue (statut {status})"
        if status == "failed" and rows:
            failed = sb.select("ingestion_runs", {
                "select": "id", "dataset_version_id": f"eq.{rows[0]['id']}",
                "kind": "eq.build", "status": "eq.failed",
            })
            if len(failed) >= MAX_FAILED_ATTEMPTS:
                needs = False
                reason = f"{len(failed)} échecs pour cette version : intervention humaine requise"
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
