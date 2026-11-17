"""check_version.py — vérification quotidienne LÉGÈRE de la source State of BIB.

Ne télécharge aucun Parquet : lit le manifeste Open Dev Data, calcule une
empreinte des ressources utilisées (chemin, taille, blake3) et la compare à ce
qui a déjà été traité. Décide si le traitement lourd (build_data.py) doit être
lancé :
    · nouvelle version du fournisseur ;
    · CORRECTION d'une version existante (même numéro, empreinte différente) :
      une version logique « <version>-rN » est construite, l'ancienne reste
      historisée ;
    · version détectée dont le traitement précédent a échoué (reprise bornée) ;
    · version en QUARANTAINE (bloquée par les contrôles automatiques) : nouvelle
      tentative automatique, bornée et espacée, ou immédiate si le pipeline a
      été mis à jour. Une correction de la source crée de toute façon une
      nouvelle révision.

Conçu pour être exécuté toutes les heures : SOB_CHECK_INTERVAL_HOURS (défaut 1)
espace les lectures du manifeste sans modifier le cron du workflow. Un
changement du manifeste ou l'apparition d'une ressource est journalisé même
s'il ne concerne pas les fichiers utilisés.

Sorties (GITHUB_OUTPUT si présent, sinon stdout) :
    needs_build=true|false
    version=<version logique à construire>
    source_version=<version du fournisseur>
    fingerprint=<sha256>
    reason=<texte>
    snapshot_age_days=<n>  stale=true|false

Variables :
    SOB_SUPABASE_SYNC=true + SUPABASE_URL + SUPABASE_SECRET_KEY → l'état de
    référence est Supabase (dataset_versions) et la vérification est
    journalisée (ingestion_runs). Sinon, la référence est la copie technique
    data/state-of-bib/current/meta.json.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

from datetime import timedelta

from paths import DATA_DIR
from pipeline_version import PIPELINE_VERSION
from source_manifest import SOB_TABLES, ManifestError, fetch_manifest, fingerprint, manifest_summary, version_of

SOURCE_ID = "electric-capital-osdd"
META_PATH = DATA_DIR / "meta.json"
HEADLINE_PATH = DATA_DIR / "headline.json"
MAX_FAILED_ATTEMPTS = int(os.environ.get("SOB_MAX_FAILED_ATTEMPTS", "3"))
STALE_DAYS = int(os.environ.get("SOB_STALE_DAYS", "120"))
# Quarantaine : tentatives automatiques bornées et espacées.
MAX_BLOCKED_ATTEMPTS = int(os.environ.get("SOB_MAX_BLOCKED_ATTEMPTS", "5"))
BLOCKED_RETRY_HOURS = float(os.environ.get("SOB_BLOCKED_RETRY_HOURS", "24"))
CHECK_INTERVAL_HOURS = float(os.environ.get("SOB_CHECK_INTERVAL_HOURS", "1") or "1")


def emit(**values: str) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    lines = [f"{k}={v}" for k, v in values.items()]
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


def local_meta() -> dict:
    try:
        return json.loads(META_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def snapshot_age_days(today: datetime | None = None) -> int | None:
    """Âge (en jours) de la copie technique, d'après headline.snapshot_date."""
    try:
        snap = json.loads(HEADLINE_PATH.read_text()).get("snapshot_date")
        d = datetime.strptime(snap, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return None
    return ((today or datetime.now(timezone.utc)) - d).days


def _parse_ts(value) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def decide(remote: str, fp: str, rows: list[dict], failed_builds: int = 0, now: datetime | None = None) -> tuple[bool, str, str]:
    """Décision pure (testable) : (needs_build, version logique, raison).

    `rows` : versions déjà connues pour cette version du fournisseur, chacune
    avec provider_version, status, source_fingerprint (None pour les lignes
    antérieures au suivi d'empreinte) et, si disponibles, attempts,
    last_attempt_at, pipeline_version.
    """
    now = now or datetime.now(timezone.utc)
    if not rows:
        return True, remote, "nouvelle version"
    same = [r for r in rows if r.get("source_fingerprint") == fp]
    legacy = [r for r in rows if not r.get("source_fingerprint")]
    match = (same or legacy or [None])[0]
    if match is None:
        # Même numéro de version, contenu différent : correction du fournisseur.
        revisions = [r["provider_version"] for r in rows if r["provider_version"].startswith(f"{remote}-r")]
        n = max([int(v.rsplit("-r", 1)[1]) for v in revisions if v.rsplit("-r", 1)[1].isdigit()] or [1]) + 1
        return True, f"{remote}-r{n}", "correction détectée (même version, empreinte différente)"
    status, version = match["status"], match["provider_version"]
    pipeline_changed = bool(match.get("pipeline_version")) and match["pipeline_version"] != PIPELINE_VERSION
    if status in ("detected", "processing"):
        return True, version, f"reprise (statut {status})"
    if status == "validated":
        # Candidate prête mais non publiée (ex. préparée en mode review) : la
        # décision est rejouée, sans retraitement des données.
        return False, version, "candidate validée : publication automatique sans retraitement (publish-pending)"
    if status == "failed":
        if pipeline_changed:
            return True, version, "reprise : pipeline mis à jour depuis l'échec"
        if failed_builds >= MAX_FAILED_ATTEMPTS:
            return False, version, f"{failed_builds} échecs pour cette version : nouvelle tentative après correction de la source ou du pipeline"
        return True, version, "reprise après échec"
    if status == "blocked":
        if pipeline_changed:
            return True, version, "quarantaine : nouvelle tentative, pipeline mis à jour"
        attempts = int(match.get("attempts") or 0)
        if attempts >= MAX_BLOCKED_ATTEMPTS:
            return False, version, (f"quarantaine : {attempts} tentatives, en attente d'une correction de la source "
                                    "ou d'une mise à jour du pipeline")
        last = _parse_ts(match.get("last_attempt_at"))
        if last is None or now - last >= timedelta(hours=BLOCKED_RETRY_HOURS):
            return True, version, f"quarantaine : nouvelle tentative automatique ({attempts + 1}/{MAX_BLOCKED_ATTEMPTS})"
        return False, version, f"quarantaine : prochaine tentative automatique {BLOCKED_RETRY_HOURS:g} h après la précédente"
    return False, version, f"version connue (statut {status})"


def interval_elapsed(last_check: datetime | None, now: datetime, hours: float = CHECK_INTERVAL_HOURS) -> bool:
    """Vrai si la dernière vérification réussie est assez ancienne (tolérance
    de 10 minutes pour les décalages du planificateur)."""
    if last_check is None or hours <= 1:
        return True
    return now - last_check >= timedelta(hours=hours) - timedelta(minutes=10)


def main() -> int:
    # Alerte d'ancienneté : visible dans le résumé GitHub Actions, même si la
    # source est inaccessible ou qu'aucune nouvelle version n'existe.
    age = snapshot_age_days()
    stale = age is not None and age > STALE_DAYS
    if stale:
        print(f"::warning title=State of BIB::copie technique vieille de {age} jours (seuil {STALE_DAYS})")
    emit(snapshot_age_days=str(age if age is not None else ""), stale="true" if stale else "false")

    sync = os.environ.get("SOB_SUPABASE_SYNC", "").strip() == "true"
    sb = None
    if sync:
        from supabase_rest import SupabaseRest

        sb = SupabaseRest()

    manual = os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
    last_details: dict = {}
    if sb is not None:
        last = sb.select("ingestion_runs", {"select": "started_at,details", "source_id": f"eq.{SOURCE_ID}",
                                            "kind": "eq.version_check", "status": "eq.succeeded",
                                            "order": "started_at.desc", "limit": "1"})
        if last:
            last_details = last[0].get("details") or {}
            if not manual and not interval_elapsed(_parse_ts(last[0].get("started_at")), datetime.now(timezone.utc)):
                emit(needs_build="false", version="", source_version="", fingerprint="",
                     reason=f"intervalle de vérification ({CHECK_INTERVAL_HOURS:g} h) non écoulé", checked="false")
                return 0

    def log(status: str, message: str, details: dict | None = None) -> None:
        if sb is None:
            return
        sb.insert("ingestion_runs", {
            "details": details or {},
            "source_id": SOURCE_ID,
            "kind": "version_check",
            "trigger": "manual" if manual else "schedule",
            "status": status,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "message": message[:500],
        }, returning=False)

    try:
        manifest = fetch_manifest()
        remote = version_of(manifest)
        fp = fingerprint(manifest, SOB_TABLES)
        summary = manifest_summary(manifest)
    except ManifestError as exc:
        # Source inaccessible ou manifeste non conforme : échec explicite et
        # journalisé, jamais un « rien à faire » silencieux.
        log("failed", f"source inaccessible : {exc}")
        if sb is not None:
            try:
                sb.insert("ops_incidents", {"kind": "sob.source_unreachable", "severity": "warning",
                                            "message": f"Source State of BIB inaccessible : {exc}"[:500], "details": {}},
                          returning=False)
            except Exception as inc:  # noqa: BLE001 — l'incident ne masque pas l'erreur
                print(f"(incident non enregistré : {inc})")
        print(f"✗ {exc}")
        return 1

    if sb is not None:
        query = {
            "source_id": f"eq.{SOURCE_ID}",
            "or": f"(provider_version.eq.{remote},source_version.eq.{remote},provider_version.like.{remote}-r*)",
        }
        try:
            rows = sb.select("dataset_versions", {**query, "select": "id,provider_version,status,source_fingerprint,pipeline_version,attempts,last_attempt_at"})
        except Exception:  # noqa: BLE001 — base antérieure à la migration 0013
            rows = sb.select("dataset_versions", {**query, "select": "id,provider_version,status,source_fingerprint,pipeline_version"})
        failed = 0
        same = [r for r in rows if r.get("source_fingerprint") in (fp, None) and r["status"] == "failed"]
        if same:
            failed = len(sb.select("ingestion_runs", {
                "select": "id", "dataset_version_id": f"eq.{same[0]['id']}",
                "kind": "eq.build", "status": "eq.failed",
            }))
        needs, version, reason = decide(remote, fp, rows, failed)
        # Changement du manifeste ou nouvelle ressource : journalisé, même sans
        # incidence sur les fichiers utilisés.
        known = set(last_details.get("resource_names") or [])
        new_resources = sorted(set(summary["resource_names"]) - known) if known else []
        manifest_changed = bool(last_details.get("manifest_hash")) and last_details["manifest_hash"] != summary["manifest_hash"]
        if new_resources:
            print(f"::notice title=State of BIB::nouvelles ressources dans le manifeste : {', '.join(new_resources[:10])}")
            try:
                sb.insert("ops_incidents", {"kind": "sob.source_new_resources", "severity": "info",
                                            "message": f"Nouvelles ressources publiées par la source : {', '.join(new_resources[:10])}"[:500],
                                            "details": {"resources": new_resources[:50], "source_version": remote}}, returning=False)
            except Exception as inc:  # noqa: BLE001
                print(f"(incident non enregistré : {inc})")
        log("succeeded", f"remote={remote} fingerprint={fp[:12]} needs_build={needs} ({reason})",
            {**summary, "source_version": remote, "fingerprint": fp, "needs_build": needs, "version": version,
             "manifest_changed": manifest_changed, "new_resources": new_resources[:50]})
    else:
        meta = local_meta()
        known = meta.get("source_version") or meta.get("dataset_version")
        rows = [] if known != remote else [{
            "provider_version": str(meta.get("dataset_version")), "status": "published",
            "source_fingerprint": meta.get("source_fingerprint"),
        }]
        needs, version, reason = decide(remote, fp, rows)

    if os.environ.get("SOB_FORCE_BUILD", "").strip() == "true":
        needs, reason = True, "reconstruction forcée"

    emit(needs_build="true" if needs else "false", version=version, source_version=remote, fingerprint=fp, reason=reason,
         checked="true")
    return 0


if __name__ == "__main__":
    sys.exit(main())
