"""publish_supabase.py — historisation et publication gouvernée de State of BIB.

Trois commandes, séparées pour respecter la revue humaine :

  stage     (job de préparation, AVANT la pull request)
            · valide public/data ;
            · enregistre la version (dataset_versions) comme CANDIDATE
              (statut « validated », jamais courante) ;
            · téléverse les JSON dans le bucket PRIVÉ bib-sob-candidates ;
            · enregistre artefacts (SHA-256, taille) et observations.
            Le pointeur « version courante » n'est PAS déplacé.

  promote   (après fusion de la PR dans la branche par défaut)
            · relit les JSON du commit approuvé (checkout de main) ;
            · vérifie qu'ils correspondent EXACTEMENT (SHA-256) à la candidate ;
            · téléverse ces fichiers approuvés dans le bucket public
              bib-sob-snapshots (chemins immuables par version) ;
            · appelle promote_dataset_version() : bascule atomique du pointeur,
              commit approuvé enregistré. En cas d'échec, la version
              précédente reste courante.

  rollback --version <provider_version>
            · réactive une version déjà publiée auparavant.

N'agit que si SOB_SUPABASE_SYNC=true (sinon sortie sans effet).
Requiert SUPABASE_URL et SUPABASE_SECRET_KEY (projet BIB uniquement).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from supabase_rest import SupabaseError, SupabaseRest
from validate import REQUIRED, validate_output_dir

SOURCE_ID = "electric-capital-osdd"
CANDIDATE_BUCKET = "bib-sob-candidates"
PUBLIC_BUCKET = "bib-sob-snapshots"
DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
VERSION_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
STALE_RUN_AFTER = timedelta(hours=2)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def trigger() -> str:
    return "manual" if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch" else "schedule"


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_files(data_dir: Path) -> dict[str, bytes]:
    errors = validate_output_dir(data_dir)
    if errors:
        raise ValueError("données invalides : " + "; ".join(errors[:10]))
    return {name: (data_dir / name).read_bytes() for name in REQUIRED}


def artifact_manifest(files: dict[str, bytes]) -> list[dict[str, str]]:
    """Liste [{name, sha256}] triée — comparée en base à la candidate."""
    return [{"name": n, "sha256": sha256(c)} for n, c in sorted(files.items())]


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


def expire_stale_runs(sb: SupabaseRest, kind: str) -> None:
    """Une exécution « running » trop ancienne (job interrompu) est marquée en échec."""
    cutoff = (datetime.now(timezone.utc) - STALE_RUN_AFTER).isoformat()
    sb.update("ingestion_runs",
              {"source_id": f"eq.{SOURCE_ID}", "kind": f"eq.{kind}", "status": "eq.running", "started_at": f"lt.{cutoff}"},
              {"status": "failed", "finished_at": now(), "message": "exécution interrompue (expirée)"})


def start_run(sb: SupabaseRest, kind: str, message: str) -> dict:
    expire_stale_runs(sb, kind)
    try:
        return sb.insert("ingestion_runs", {"source_id": SOURCE_ID, "kind": kind, "status": "running",
                                            "trigger": trigger(), "message": message})[0]
    except SupabaseError as exc:
        # Index unique : une exécution du même type est déjà en cours.
        raise SupabaseError(f"une exécution « {kind} » est déjà en cours ({exc})") from exc


def finish_run(sb: SupabaseRest, run_id: str, status: str, message: str | None = None, details: dict | None = None) -> None:
    values: dict = {"status": status, "finished_at": now()}
    if message:
        values["message"] = message[:500]
    if details:
        values["details"] = details
    sb.update("ingestion_runs", {"id": f"eq.{run_id}"}, values)


def find_version(sb: SupabaseRest, provider_version: str) -> dict | None:
    rows = sb.select("dataset_versions", {"select": "id,status,is_current", "source_id": f"eq.{SOURCE_ID}",
                                          "provider_version": f"eq.{provider_version}", "limit": "1"})
    return rows[0] if rows else None


# ── A/B : préparation d'une candidate ─────────────────────────────────────
def stage(sb: SupabaseRest, data_dir: Path) -> int:
    files = load_files(data_dir)
    meta = json.loads(files["meta.json"])
    headline = json.loads(files["headline.json"])
    provider_version = str(meta["dataset_version"])
    if not VERSION_RE.match(provider_version):
        raise ValueError(f"version source inattendue : {provider_version!r}")
    as_of = headline["snapshot_date"]

    run = start_run(sb, "build", provider_version)
    try:
        existing = find_version(sb, provider_version)
        if existing and existing["status"] in ("published", "superseded"):
            print(f"Version {provider_version} déjà publiée : aucune nouvelle candidate.")
            finish_run(sb, run["id"], "skipped", "déjà publiée")
            return 0
        if existing and existing["status"] == "validated":
            print(f"Candidate {provider_version} déjà préparée : en attente d'approbation.")
            finish_run(sb, run["id"], "skipped", "candidate existante")
            return 0

        if existing:
            version_id = existing["id"]
        else:
            version_id = sb.insert("dataset_versions", {
                "source_id": SOURCE_ID, "provider_version": provider_version, "as_of_date": as_of,
                "status": "processing", "pipeline_version": meta.get("pipeline_version"),
                "block_number": meta.get("block_number"),
            })[0]["id"]
        sb.update("dataset_versions", {"id": f"eq.{version_id}"}, {"status": "processing", "processed_at": now()})
        sb.update("ingestion_runs", {"id": f"eq.{run['id']}"}, {"dataset_version_id": version_id})

        artifacts = []
        for name, content in sorted(files.items()):
            path = f"versions/{provider_version}/{name}"
            sb.upload(CANDIDATE_BUCKET, path, content, "application/json")
            artifacts.append({"dataset_version_id": version_id, "name": name, "storage_path": path,
                              "sha256": sha256(content), "size_bytes": len(content)})
        sb.insert("dataset_artifacts", artifacts, on_conflict="dataset_version_id,name", ignore_duplicates=True, returning=False)

        obs = observations(version_id, as_of, headline,
                           json.loads(files["country_map.json"]), json.loads(files["top_cities.json"]))
        for i in range(0, len(obs), 500):
            sb.insert("metric_observations", obs[i:i + 500],
                      on_conflict="dataset_version_id,metric_key,dimension_type,dimension_value,period_start",
                      ignore_duplicates=True, returning=False)

        # Candidate prête : AUCUN déplacement du pointeur courant ici.
        sb.update("dataset_versions", {"id": f"eq.{version_id}"}, {"status": "validated", "candidate_at": now()})
        finish_run(sb, run["id"], "succeeded", f"candidate {provider_version}",
                   {"observations": len(obs), "artifacts": artifact_manifest(files)})
        print(f"✓ candidate {provider_version} préparée ({len(obs)} observations) — publication après approbation de la PR.")
        return 0
    except (SupabaseError, KeyError, ValueError) as exc:
        finish_run(sb, run["id"], "failed", str(exc))
        sb.update("dataset_versions", {"provider_version": f"eq.{provider_version}", "source_id": f"eq.{SOURCE_ID}",
                                       "status": "in.(detected,processing)"}, {"status": "failed"})
        print(f"✗ préparation échouée : {exc}")
        return 1


# ── D : promotion du commit approuvé ──────────────────────────────────────
def promote(sb: SupabaseRest, data_dir: Path, commit_sha: str) -> int:
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha or ""):
        raise ValueError("SHA du commit approuvé requis (40 caractères hexadécimaux).")
    files = load_files(data_dir)
    provider_version = str(json.loads(files["meta.json"])["dataset_version"])
    version = find_version(sb, provider_version)
    if not version:
        print(f"✗ aucune candidate enregistrée pour {provider_version} : promotion refusée.")
        return 2
    if version["status"] == "published" and version["is_current"]:
        print(f"Version {provider_version} déjà courante : rien à faire.")
        return 0

    run = start_run(sb, "publish", provider_version)
    try:
        manifest = artifact_manifest(files)
        # Fichiers APPROUVÉS (ceux du commit fusionné) copiés vers le bucket public,
        # avant la bascule : le pointeur ne désigne jamais des fichiers absents.
        for name, content in sorted(files.items()):
            sb.upload(PUBLIC_BUCKET, f"versions/{provider_version}/{name}", content, "application/json")
        result = sb.rpc("promote_dataset_version", {"p_version_id": version["id"], "p_commit_sha": commit_sha,
                                                    "p_artifacts": manifest})
        finish_run(sb, run["id"], "succeeded", f"promotion {provider_version}: {result}",
                   {"commit": commit_sha, "artifacts": manifest})
        print(f"✓ version {provider_version} publiée depuis le commit {commit_sha[:12]} ({result}).")
        return 0
    except (SupabaseError, KeyError, ValueError) as exc:
        finish_run(sb, run["id"], "failed", str(exc), {"commit": commit_sha})
        print(f"✗ promotion refusée ou échouée : {exc} — la version précédente reste courante.")
        return 1


# ── E : repli ─────────────────────────────────────────────────────────────
def rollback(sb: SupabaseRest, provider_version: str) -> int:
    version = find_version(sb, provider_version)
    if not version:
        print(f"✗ version {provider_version} inconnue.")
        return 2
    result = sb.rpc("rollback_dataset_version", {"p_version_id": version["id"]})
    print(f"✓ repli sur {provider_version} ({result}).")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("stage")
    p_promote = sub.add_parser("promote")
    p_promote.add_argument("--commit", default=os.environ.get("GITHUB_SHA", ""))
    p_rollback = sub.add_parser("rollback")
    p_rollback.add_argument("--version", required=True)
    for p in sub.choices.values():
        p.add_argument("--data-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args(argv)

    if os.environ.get("SOB_SUPABASE_SYNC", "").strip() != "true":
        print("SOB_SUPABASE_SYNC n'est pas activé : aucune écriture Supabase.")
        return 0
    try:
        sb = SupabaseRest()
        if args.cmd == "stage":
            return stage(sb, args.data_dir)
        if args.cmd == "promote":
            return promote(sb, args.data_dir, args.commit)
        return rollback(sb, args.version)
    except (SupabaseError, ValueError) as exc:
        print(f"✗ {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
