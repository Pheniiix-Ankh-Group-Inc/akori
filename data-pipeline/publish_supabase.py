"""publish_supabase.py — historisation State of BIB dans Supabase BIB.

Après un build validé (public/data/*.json), ce script :
  1. enregistre la version (dataset_versions) — idempotent ;
  2. téléverse les snapshots JSON IMMUABLES dans Storage :
        bib-sob-snapshots/versions/<provider_version>/<fichier>.json
  3. enregistre les artefacts (sha256, taille) et les observations normalisées
     (totaux, par pays, par ville) — sans dupliquer une version déjà traitée ;
  4. marque la version « validated » puis appelle publish_dataset_version()
     qui déplace atomiquement le pointeur « courant ».
En cas d'échec, la version précédente reste la version publiée.

N'agit que si SOB_SUPABASE_SYNC=true (sinon sortie sans effet).
Requiert SUPABASE_URL et SUPABASE_SECRET_KEY (projet BIB uniquement).
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from supabase_rest import SupabaseRest, SupabaseError
from validate import REQUIRED, validate_output_dir

SOURCE_ID = "electric-capital-osdd"
BUCKET = "bib-sob-snapshots"
DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def observations(version_id: str, as_of: str, headline: dict, countries: list, cities: list) -> list[dict]:
    rows: list[dict] = []
    for key in ("devs_active_28d", "ecosystems", "countries", "cities", "commits_lifetime"):
        value = headline.get(key)
        if isinstance(value, int):
            rows.append({"dataset_version_id": version_id, "metric_key": key, "dimension_type": "total",
                         "dimension_value": "", "as_of_date": as_of, "value": value})
    for c in countries:
        if isinstance(c.get("devs_active_28d"), int):
            rows.append({"dataset_version_id": version_id, "metric_key": "country_devs_active_28d",
                         "dimension_type": "country", "dimension_value": c["iso_a3"], "as_of_date": as_of,
                         "value": c["devs_active_28d"]})
    for c in cities:
        if isinstance(c.get("devs_active_28d"), int):
            rows.append({"dataset_version_id": version_id, "metric_key": "city_devs_active_28d",
                         "dimension_type": "city", "dimension_value": f"{c.get('city')}|{c.get('iso_a3')}",
                         "as_of_date": as_of, "value": c["devs_active_28d"]})
    return rows


def main() -> int:
    if os.environ.get("SOB_SUPABASE_SYNC", "").strip() != "true":
        print("SOB_SUPABASE_SYNC n'est pas activé : aucune écriture Supabase.")
        return 0

    errors = validate_output_dir(DATA_DIR)
    if errors:
        print("✗ données invalides, publication annulée :")
        for e in errors:
            print(f"  · {e}")
        return 2

    files = {name: (DATA_DIR / name).read_bytes() for name in REQUIRED}
    meta = json.loads(files["meta.json"])
    headline = json.loads(files["headline.json"])
    provider_version = meta["dataset_version"]
    as_of = headline["snapshot_date"]

    sb = SupabaseRest()
    run = sb.insert("ingestion_runs", {"source_id": SOURCE_ID, "kind": "publish", "status": "running",
                                       "trigger": "manual" if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch" else "schedule",
                                       "message": provider_version})[0]
    try:
        existing = sb.select("dataset_versions", {"select": "id,status", "source_id": f"eq.{SOURCE_ID}",
                                                  "provider_version": f"eq.{provider_version}", "limit": "1"})
        if existing and existing[0]["status"] in ("published", "superseded"):
            print(f"Version {provider_version} déjà publiée : rien à faire.")
            sb.update("ingestion_runs", {"id": f"eq.{run['id']}"}, {"status": "skipped", "finished_at": now()})
            return 0

        if existing:
            version_id = existing[0]["id"]
        else:
            version_id = sb.insert("dataset_versions", {
                "source_id": SOURCE_ID, "provider_version": provider_version, "as_of_date": as_of,
                "status": "processing", "pipeline_version": meta.get("pipeline_version"),
                "block_number": meta.get("block_number"),
            })[0]["id"]
        sb.update("dataset_versions", {"id": f"eq.{version_id}"}, {"status": "processing", "processed_at": now()})
        sb.update("ingestion_runs", {"id": f"eq.{run['id']}"}, {"dataset_version_id": version_id})

        # Snapshots immuables + artefacts
        artifacts = []
        for name, content in files.items():
            path = f"versions/{provider_version}/{name}"
            sb.upload(BUCKET, path, content, "application/json")
            artifacts.append({"dataset_version_id": version_id, "name": name, "storage_path": path,
                              "sha256": hashlib.sha256(content).hexdigest(), "size_bytes": len(content)})
        sb.insert("dataset_artifacts", artifacts, on_conflict="dataset_version_id,name", ignore_duplicates=True, returning=False)

        # Observations normalisées (idempotent grâce à la contrainte d'unicité)
        obs = observations(version_id, as_of, headline,
                           json.loads(files["country_map.json"]), json.loads(files["top_cities.json"]))
        for i in range(0, len(obs), 500):
            sb.insert("metric_observations", obs[i:i + 500],
                      on_conflict="dataset_version_id,metric_key,dimension_type,dimension_value,period_start",
                      ignore_duplicates=True, returning=False)

        sb.update("dataset_versions", {"id": f"eq.{version_id}"}, {"status": "validated"})
        sb.rpc("publish_dataset_version", {"p_version_id": version_id})
        sb.update("ingestion_runs", {"id": f"eq.{run['id']}"}, {"status": "succeeded", "finished_at": now()})
        print(f"✓ version {provider_version} publiée ({len(obs)} observations).")
        return 0
    except (SupabaseError, KeyError, ValueError) as exc:
        sb.update("ingestion_runs", {"id": f"eq.{run['id']}"},
                  {"status": "failed", "finished_at": now(), "message": str(exc)[:500]})
        try:
            sb.update("dataset_versions", {"provider_version": f"eq.{provider_version}", "source_id": f"eq.{SOURCE_ID}",
                                           "status": "in.(detected,processing,validated)"}, {"status": "failed"})
        except SupabaseError:
            pass
        print(f"✗ publication échouée : {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
