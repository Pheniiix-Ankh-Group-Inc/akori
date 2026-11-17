"""publish_supabase.py — historisation et publication gouvernée de State of BIB.

Commande principale (V2, Supabase source primaire, sans fusion de PR) :

  ingest    · valide le lot (schéma, cohérence croisée, recalcul indépendant,
              périmètre, provenance) et enregistre le rapport
              (dataset_versions.validation_report) ;
            · lot invalide → version « blocked » + incident ; la dernière
              version valide reste en ligne ;
            · lot valide → candidate « validated » (bucket PRIVÉ, artefacts
              SHA-256, observations historisées) ;
            · forte variation d'un indicateur → CONTRÔLES RENFORCÉS
              automatiques (reinforced.py) : publication s'ils confirment la
              cohérence, sinon quarantaine et nouvelle tentative automatique ;
            · mode « sob » (auto par défaut, sans aucune approbation humaine) :
                auto   → publication atomique + vérification après publication
                         (retour automatique à la version précédente si les
                         artefacts publiés ne sont pas intègres) ;
                review → attente d'une approbation (mode optionnel) ;
                paused → collecte uniquement (mode optionnel).

Autres commandes :

  reconcile       · compare la version courante dans PostgreSQL, ses artefacts
                    dans Storage (SHA-256) et la copie technique du dépôt
                    (data/state-of-bib/current) ; journalise l'écart
                    (ingestion_runs « reconcile ») et crée un incident. Les
                    trois supports ne forment pas une transaction : un écart
                    est détecté et signalé, jamais masqué.
  export-current  · écrit dans --data-dir les artefacts de la version courante,
                    vérifiés par SHA-256 (synchronisation du dépôt, reprise).
  rollback --version <provider_version>
                  · restaure une version publiée auparavant (RPC
                    restore_dataset_version).

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
from reinforced import reinforced_checks
from validate import REQUIRED, consistency_anomalies, validate_output_dir

SOURCE_ID = "electric-capital-osdd"
CANDIDATE_BUCKET = "bib-sob-candidates"
from paths import DATA_DIR  # noqa: E402
VERSION_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
STALE_RUN_AFTER = timedelta(hours=2)
SOURCE_URL = "https://github.com/electric-capital/open-dev-data"
# Variation relative au-delà de laquelle les contrôles renforcés automatiques
# s'appliquent avant publication (aucune approbation humaine n'est requise).
REVIEW_DIVERGENCE = float(os.environ.get("SOB_STRONG_VARIATION") or "0.5")
TOTAL_METRICS = ("devs_active_28d", "ecosystems", "countries", "cities", "commits_lifetime")


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
    params = {"source_id": f"eq.{SOURCE_ID}", "provider_version": f"eq.{provider_version}", "limit": "1"}
    try:
        rows = sb.select("dataset_versions", {**params, "select": "id,status,is_current,validation_report,attempts"})
    except SupabaseError:
        # Base antérieure à la migration 0013 (colonne attempts absente).
        rows = sb.select("dataset_versions", {**params, "select": "id,status,is_current,validation_report"})
    return rows[0] if rows else None


def track_attempt(sb: SupabaseRest, version_id: str, previous_attempts: int, quarantine: str | None = None) -> None:
    """Compte la tentative (reprise automatique bornée). Sans effet si la
    migration 0013 n'est pas appliquée."""
    try:
        sb.update("dataset_versions", {"id": f"eq.{version_id}"},
                  {"attempts": previous_attempts + 1, "last_attempt_at": now(), "quarantine_reason": quarantine})
    except SupabaseError as exc:
        print(f"(tentative non comptabilisée : {exc})")


# ── V2 : ingestion, rapport de validation et décision par mode ─────────────
def current_totals(sb: SupabaseRest) -> tuple[str | None, dict[str, float]]:
    """Version courante et ses indicateurs totaux (observations historisées)."""
    rows = sb.select("dataset_versions", {"select": "id,provider_version", "source_id": f"eq.{SOURCE_ID}",
                                          "is_current": "eq.true", "limit": "1"})
    if not rows:
        return None, {}
    obs = sb.select("metric_observations", {"select": "metric_key,value", "dataset_version_id": f"eq.{rows[0]['id']}",
                                            "dimension_type": "eq.total"})
    return rows[0]["provider_version"], {o["metric_key"]: float(o["value"]) for o in obs}


def load_previous(sb: SupabaseRest) -> dict | None:
    """Version courante complète pour les contrôles renforcés : totaux,
    développeurs par pays et séries mensuelles (artefacts privés, SHA vérifié)."""
    rows = sb.select("dataset_versions", {
        "select": "id,provider_version,as_of_date,dataset_artifacts(name,storage_path,sha256)",
        "source_id": f"eq.{SOURCE_ID}", "is_current": "eq.true", "limit": "1"})
    if not rows:
        return None
    cur = rows[0]
    obs = sb.select("metric_observations", {"select": "metric_key,dimension_type,dimension_value,value",
                                            "dataset_version_id": f"eq.{cur['id']}",
                                            "dimension_type": "in.(total,country)"})
    previous = {
        "version": cur["provider_version"], "as_of_date": cur.get("as_of_date"),
        "totals": {o["metric_key"]: float(o["value"]) for o in obs if o["dimension_type"] == "total"},
        "countries": {o["dimension_value"]: float(o["value"]) for o in obs
                      if o["dimension_type"] == "country" and o["metric_key"] == "country_devs_active_28d"},
        "ecosystem_mix": None, "tenure_cohort": None,
    }
    for art in cur.get("dataset_artifacts") or []:
        key = {"ecosystem_mix.json": "ecosystem_mix", "tenure_cohort.json": "tenure_cohort"}.get(art["name"])
        if not key:
            continue
        try:
            blob = sb.download(CANDIDATE_BUCKET, art["storage_path"])
            if blob is not None and sha256(blob) == art["sha256"]:
                previous[key] = json.loads(blob)
        except (SupabaseError, ValueError):
            pass  # historique indisponible : le contrôle correspondant est « non applicable »
    return previous


def divergence(headline: dict, previous: dict[str, float]) -> list[dict]:
    out = []
    for key in TOTAL_METRICS:
        new, old = headline.get(key), previous.get(key)
        if not isinstance(new, (int, float)) or old is None:
            continue
        change = (new - old) / old if old else None
        out.append({"metric": key, "previous": old, "candidate": new,
                    "relative_change": round(change, 4) if change is not None else None})
    return out


def build_report(data_dir: Path, previous_version: str | None, previous: dict[str, float]) -> dict:
    """Rapport de validation enregistré avec la version (aucune correction des données)."""
    schema = validate_output_dir(data_dir)
    consistency: list[str] = []
    meta: dict = {}
    headline: dict = {}
    if not schema:
        consistency = consistency_anomalies(data_dir)
        meta = json.loads((data_dir / "meta.json").read_text())
        headline = json.loads((data_dir / "headline.json").read_text())
    div = divergence(headline, previous) if headline else []
    strong = [d for d in div if d["relative_change"] is not None and abs(d["relative_change"]) > REVIEW_DIVERGENCE]
    return {
        "passed": not schema and not consistency,
        # Forte variation : contrôles renforcés automatiques (jamais une approbation humaine).
        "strong_variation": bool(strong),
        "checked_at": now(),
        "schema_errors": schema[:50],
        "consistency_anomalies": consistency[:50],
        "divergence": {"previous_version": previous_version, "threshold": REVIEW_DIVERGENCE, "metrics": div,
                       "strong": [d["metric"] for d in strong]},
        "provenance": {
            "source_id": SOURCE_ID, "source_url": SOURCE_URL,
            "dataset_version": meta.get("dataset_version"), "pipeline_version": meta.get("pipeline_version"),
            "source_version": meta.get("source_version"), "source_fingerprint": meta.get("source_fingerprint"),
            "source_resources": meta.get("source_resources"),
            "block_number": meta.get("block_number"), "generated_at": meta.get("generated_at"),
            "commit": os.environ.get("GITHUB_SHA") or None,
            "workflow_run": os.environ.get("GITHUB_RUN_ID") or None,
        },
    }


def _source_columns(report: dict) -> dict:
    """Colonnes de provenance fine (migration 0012) ; omises si absentes du lot."""
    prov = report.get("provenance") or {}
    cols = {}
    if prov.get("source_version"):
        cols["source_version"] = str(prov["source_version"])[:64]
    if re.fullmatch(r"[0-9a-f]{64}", str(prov.get("source_fingerprint") or "")):
        cols["source_fingerprint"] = prov["source_fingerprint"]
    return cols


def automation_mode(sb: SupabaseRest, module: str = "sob") -> str:
    rows = sb.select("automation_settings", {"select": "mode", "module": f"eq.{module}", "limit": "1"})
    # Réglage absent ou illisible : mode automatique (fonctionnement normal du MVP).
    mode = rows[0]["mode"] if rows else "auto"
    return mode if mode in ("auto", "review", "paused") else "auto"


def incident(sb: SupabaseRest, kind: str, severity: str, message: str, details: dict) -> None:
    try:
        sb.insert("ops_incidents", {"kind": kind, "severity": severity, "message": message[:500], "details": details},
                  returning=False)
    except SupabaseError as exc:  # l'incident ne doit jamais masquer l'erreur d'origine
        print(f"(incident non enregistré : {exc})")


def ingest(sb: SupabaseRest, data_dir: Path) -> int:
    meta_path = data_dir / "meta.json"
    try:
        provider_version = str(json.loads(meta_path.read_text())["dataset_version"])
    except (OSError, ValueError, KeyError) as exc:
        raise ValueError(f"meta.json illisible : {exc}") from exc
    if not VERSION_RE.match(provider_version):
        raise ValueError(f"version source inattendue : {provider_version!r}")

    mode = automation_mode(sb)
    run = start_run(sb, "build", provider_version)
    try:
        existing = find_version(sb, provider_version)
        if existing and existing["status"] in ("published", "superseded", "rejected"):
            finish_run(sb, run["id"], "skipped", f"version {existing['status']}")
            print(f"Version {provider_version} déjà traitée ({existing['status']}) : rien à faire.")
            return 0
        if existing and existing["status"] == "validated":
            # Candidate déjà préparée (ex. créée pendant un mode review ou une
            # exécution interrompue) : la décision est rejouée sans réingestion.
            result, code = decide(sb, existing["id"], provider_version, mode, existing.get("validation_report") or {}, None)
            finish_run(sb, run["id"], "succeeded" if code == 0 else "failed", f"candidate existante — {result}")
            return code

        previous = load_previous(sb)
        prev_version, prev_totals = (previous["version"], previous["totals"]) if previous else (None, {})
        report = build_report(data_dir, prev_version, prev_totals)
        attempts = int((existing or {}).get("attempts") or 0)
        headline = json.loads((data_dir / "headline.json").read_text()) if not report["schema_errors"] else {}
        as_of = headline.get("snapshot_date") or datetime.now(timezone.utc).date().isoformat()

        if existing:
            version_id = existing["id"]
        else:
            version_id = sb.insert("dataset_versions", {
                "source_id": SOURCE_ID, "provider_version": provider_version, "as_of_date": as_of,
                "status": "processing", "pipeline_version": report["provenance"]["pipeline_version"],
                **_source_columns(report),
                "block_number": report["provenance"]["block_number"],
            })[0]["id"]
        sb.update("ingestion_runs", {"id": f"eq.{run['id']}"}, {"dataset_version_id": version_id})

        if not report["passed"]:
            sb.update("dataset_versions", {"id": f"eq.{version_id}"},
                      {"status": "blocked", "processed_at": now(), "validation_report": report})
            problems = report["schema_errors"] + report["consistency_anomalies"]
            track_attempt(sb, version_id, attempts, f"validation : {problems[0] if problems else 'échec'}"[:900])
            incident(sb, "sob.validation_blocked", "warning",
                     f"State of BIB {provider_version} bloquée : {len(problems)} anomalie(s)",
                     {"version": provider_version, "first": problems[:5]})
            finish_run(sb, run["id"], "failed", "validation bloquante", {"problems": problems[:20]})
            print(f"✗ version {provider_version} bloquée ({len(problems)} anomalie(s)) — rien n'est publié.")
            return 1

        files = {name: (data_dir / name).read_bytes() for name in REQUIRED}
        sb.update("dataset_versions", {"id": f"eq.{version_id}"}, {"status": "processing", "processed_at": now()})
        if existing:
            # Nouvelle tentative d'une version jamais publiée (quarantaine,
            # échec) : ses anciens artefacts et observations sont remplacés,
            # pour que la base décrive exactement le lot de cette tentative.
            sb.delete("dataset_artifacts", {"dataset_version_id": f"eq.{version_id}"})
            sb.delete("metric_observations", {"dataset_version_id": f"eq.{version_id}"})
        artifacts = []
        for name, content in sorted(files.items()):
            # Chemin adressé par le contenu : les objets Storage sont immuables ;
            # un lot recalculé ne peut ni écraser ni réutiliser un ancien fichier.
            path = f"versions/{provider_version}/{sha256(content)[:16]}/{name}"
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
        # Forte variation : contrôles renforcés automatiques, avant toute décision.
        if report["strong_variation"]:
            from country_scope import SCOPE_ISO_A3  # import tardif (dépendance pycountry)

            report["reinforced"] = reinforced_checks(data_dir, previous, report["divergence"]["strong"], set(SCOPE_ISO_A3))
            if not report["reinforced"]["passed"]:
                failed = [c for c in report["reinforced"]["checks"] if not c["passed"]]
                reason = "; ".join(f"{c['name']} : {c['detail']}" for c in failed)[:900]
                report["passed"] = False
                sb.update("dataset_versions", {"id": f"eq.{version_id}"},
                          {"status": "blocked", "candidate_at": now(), "validation_report": report})
                track_attempt(sb, version_id, attempts, f"variation forte non confirmée — {reason}")
                incident(sb, "sob.quarantine", "warning",
                         f"State of BIB {provider_version} en quarantaine : forte variation non confirmée par les contrôles renforcés",
                         {"version": provider_version, "strong": report["divergence"]["strong"], "failed": [c["name"] for c in failed]})
                finish_run(sb, run["id"], "failed", "quarantaine (contrôles renforcés)", {"failed": failed[:10]})
                print(f"✗ version {provider_version} en quarantaine — {reason}")
                print("  La dernière version valide reste en ligne ; nouvelle tentative automatique ultérieure.")
                return 1
            print(f"Forte variation ({', '.join(report['divergence']['strong'])}) confirmée par les contrôles renforcés.")

        sb.update("dataset_versions", {"id": f"eq.{version_id}"},
                  {"status": "validated", "candidate_at": now(), "validation_report": report})
        track_attempt(sb, version_id, attempts)

        result, code = decide(sb, version_id, provider_version, mode, report, files)
        finish_run(sb, run["id"], "succeeded" if code == 0 else "failed", f"candidate {provider_version} — {result}",
                   {"observations": len(obs), "artifacts": artifact_manifest(files), "mode": mode})
        return code
    except (SupabaseError, KeyError, ValueError, OSError) as exc:
        finish_run(sb, run["id"], "failed", str(exc))
        sb.update("dataset_versions", {"provider_version": f"eq.{provider_version}", "source_id": f"eq.{SOURCE_ID}",
                                       "status": "in.(detected,processing)"}, {"status": "failed"})
        incident(sb, "sob.ingest_failed", "warning", f"Ingestion State of BIB {provider_version} en échec",
                 {"error": str(exc)[:300]})
        print(f"✗ ingestion échouée : {exc}")
        return 1


def decide(sb: SupabaseRest, version_id: str, provider_version: str, mode: str, report: dict,
           files: dict[str, bytes] | None) -> tuple[str, int]:
    """Décision de publication. En mode auto (fonctionnement normal), une
    candidate validée est publiée sans aucune intervention humaine, puis la
    publication est vérifiée. Renvoie (résumé, code de sortie)."""
    if mode == "paused":
        print(f"Mode « paused » : candidate {provider_version} collectée, non publiée.")
        return "collectée (paused)", 0
    if mode == "review":
        print(f"Mode « review » : candidate {provider_version} en attente d'approbation dans /admin/state-of-bib.")
        return "en attente de revue", 0
    if report.get("strong_variation") and not (report.get("reinforced") or {}).get("passed"):
        # Candidate ancienne sans contrôles renforcés enregistrés : jamais publiée à l'aveugle.
        incident(sb, "sob.quarantine", "warning",
                 f"State of BIB {provider_version} : forte variation sans contrôles renforcés concluants", {"version": provider_version})
        return "quarantaine (contrôles renforcés absents)", 1
    note = "publication automatique (mode auto)"
    if report.get("strong_variation"):
        note += " — forte variation confirmée par les contrôles renforcés"
    try:
        result = sb.rpc("publish_dataset_candidate", {"p_version_id": version_id, "p_note": note})
    except SupabaseError as exc:
        # Refus de la base (ex. version plus ancienne que la version courante,
        # mode modifié entre-temps) : rien n'est publié, la version courante reste.
        incident(sb, "sob.publish_refused", "warning", f"Publication de {provider_version} refusée par la base",
                 {"version": provider_version, "error": str(exc)[:300]})
        print(f"✗ publication refusée par la base : {exc}")
        return "publication refusée", 1
    print(f"✓ version {provider_version} publiée automatiquement ({result}).")
    problems = verify_publication(sb, version_id, provider_version, files)
    if problems:
        return f"publiée puis annulée ({len(problems)} anomalie(s))", 1
    return f"publiée et vérifiée ({result})", 0


def verify_publication(sb: SupabaseRest, version_id: str, provider_version: str, files: dict[str, bytes] | None) -> list[str]:
    """Vérification APRÈS publication : pointeur courant, identifiant de
    version, artefacts (empreintes SHA-256 dans Storage), observations.
    En cas d'anomalie : incident critique et retour automatique à la version
    précédente (réconciliation), pour ne jamais servir un lot non intègre."""
    problems: list[str] = []
    rows = sb.select("dataset_versions", {
        "select": "id,provider_version,status,is_current,dataset_artifacts(name,storage_path,sha256)",
        "source_id": f"eq.{SOURCE_ID}", "is_current": "eq.true"})
    if len(rows) != 1:
        problems.append(f"{len(rows)} version(s) courante(s) au lieu d'une")
    cur = rows[0] if rows else {}
    if cur and (cur.get("id") != version_id or cur.get("provider_version") != provider_version):
        problems.append(f"version courante {cur.get('provider_version')} au lieu de {provider_version}")
    if cur and cur.get("status") != "published":
        problems.append(f"statut {cur.get('status')} au lieu de published")
    arts = {a["name"]: a for a in cur.get("dataset_artifacts") or []}
    for name in REQUIRED:
        art = arts.get(name)
        if not art:
            problems.append(f"{name} : artefact absent")
            continue
        blob = sb.download(CANDIDATE_BUCKET, art["storage_path"])
        if blob is None:
            problems.append(f"{name} : objet absent de Storage")
        elif sha256(blob) != art["sha256"]:
            problems.append(f"{name} : SHA-256 Storage différent de PostgreSQL")
        elif files is not None and sha256(files[name]) != art["sha256"]:
            problems.append(f"{name} : artefact différent du lot construit")
        elif name == "meta.json" and json.loads(blob).get("dataset_version") != provider_version:
            problems.append("meta.json : identifiant de version différent")
    if cur and not sb.select("metric_observations", {"select": "id", "dataset_version_id": f"eq.{version_id}", "limit": "1"}):
        problems.append("aucune observation enregistrée")
    if not problems:
        print("✓ publication vérifiée : pointeur, version, artefacts (SHA-256) et observations conformes.")
        return []

    print("✗ vérification après publication en échec :")
    for pb in problems:
        print(f"  · {pb}")
    restored = None
    try:
        older = sb.select("dataset_versions", {"select": "id,provider_version", "source_id": f"eq.{SOURCE_ID}",
                                               "status": "eq.superseded", "order": "published_at.desc", "limit": "1"})
        if older:
            sb.rpc("restore_dataset_version", {"p_version_id": older[0]["id"]})
            restored = older[0]["provider_version"]
            print(f"  → retour automatique à la version {restored}.")
    except SupabaseError as exc:
        print(f"  (retour automatique impossible : {exc})")
    incident(sb, "sob.desync", "critical",
             f"State of BIB {provider_version} : publication non intègre" + (f", retour à {restored}" if restored else ", aucune version précédente à restaurer"),
             {"version": provider_version, "problems": problems[:10], "restored": restored})
    return problems


def publish_pending(sb: SupabaseRest) -> int:
    """Publie automatiquement une candidate déjà validée mais non publiée
    (préparée pendant un mode review, ou exécution interrompue avant la
    décision). Sans retraitement des données ; idempotent."""
    mode = automation_mode(sb)
    cur = current_version(sb)
    rows = sb.select("dataset_versions", {"select": "id,provider_version,as_of_date,validation_report",
                                          "source_id": f"eq.{SOURCE_ID}", "status": "eq.validated",
                                          "order": "as_of_date.desc,created_at.desc", "limit": "1"})
    if not rows:
        print("Aucune candidate validée en attente.")
        _emit(published="false")
        return 0
    cand = rows[0]
    if mode != "auto":
        print(f"Candidate {cand['provider_version']} en attente ; mode « {mode} » : aucune publication automatique.")
        _emit(published="false")
        return 0
    run = start_run(sb, "publish", cand["provider_version"])
    result, code = decide(sb, cand["id"], cand["provider_version"], mode, cand.get("validation_report") or {}, None)
    finish_run(sb, run["id"], "succeeded" if code == 0 else "failed", f"candidate en attente — {result}",
               {"previous": (cur or {}).get("provider_version")})
    _emit(published="true" if code == 0 else "false")
    return code


# ── Réconciliation PostgreSQL / Storage / dépôt ───────────────────────────
def current_version(sb: SupabaseRest) -> dict | None:
    rows = sb.select("dataset_versions", {
        "select": "id,provider_version,published_at,dataset_artifacts(name,storage_path,sha256)",
        "source_id": f"eq.{SOURCE_ID}", "is_current": "eq.true", "limit": "1"})
    return rows[0] if rows else None


def reconcile(sb: SupabaseRest, data_dir: Path) -> int:
    """État des trois supports. Code retour : 0 synchronisés, 3 dépôt en retard,
    1 incohérence Storage (la version courante ne doit pas être servie ainsi)."""
    cur = current_version(sb)
    if not cur:
        print("Aucune version courante dans PostgreSQL : rien à réconcilier.")
        _emit(repo_sync_needed="false", reconcile="no_current")
        return 0
    arts = {a["name"]: a for a in cur.get("dataset_artifacts") or []}
    storage_bad, repo_diff = [], []
    for name in REQUIRED:
        art = arts.get(name)
        if not art:
            storage_bad.append(f"{name}: artefact absent de PostgreSQL")
            continue
        blob = sb.download(CANDIDATE_BUCKET, art["storage_path"])
        if blob is None:
            storage_bad.append(f"{name}: objet absent de Storage")
        elif sha256(blob) != art["sha256"]:
            storage_bad.append(f"{name}: SHA-256 Storage différent de PostgreSQL")
        local = data_dir / name
        if not local.exists() or sha256(local.read_bytes()) != art["sha256"]:
            repo_diff.append(name)
    state = "storage_mismatch" if storage_bad else "repo_behind" if repo_diff else "in_sync"
    details = {"version": cur["provider_version"], "state": state, "storage": storage_bad[:10], "repo": repo_diff}
    try:
        sb.insert("ingestion_runs", {
            "source_id": SOURCE_ID, "dataset_version_id": cur["id"], "kind": "reconcile", "trigger": trigger(),
            "status": "failed" if storage_bad else "succeeded", "finished_at": now(),
            "message": f"{cur['provider_version']} : {state}", "details": details}, returning=False)
    except SupabaseError as exc:
        print(f"(réconciliation non journalisée : {exc})")
    if storage_bad:
        incident(sb, "sob.desync", "critical",
                 f"State of BIB {cur['provider_version']} : artefacts Storage incohérents avec PostgreSQL", details)
        print("✗ incohérence Storage / PostgreSQL :")
        for pb in storage_bad:
            print(f"  · {pb}")
        _emit(repo_sync_needed="false", reconcile=state)
        return 1
    if repo_diff:
        print(f"Dépôt en retard sur la version courante {cur['provider_version']} : {', '.join(repo_diff)}")
        _emit(repo_sync_needed="true", reconcile=state, current_version=cur["provider_version"])
        return 3
    print(f"✓ PostgreSQL, Storage et dépôt alignés sur {cur['provider_version']}.")
    _emit(repo_sync_needed="false", reconcile=state, current_version=cur["provider_version"])
    return 0


def export_current(sb: SupabaseRest, data_dir: Path) -> int:
    """Écrit les artefacts de la version courante, vérifiés, dans data_dir."""
    cur = current_version(sb)
    if not cur:
        print("✗ aucune version courante à exporter.")
        return 2
    arts = {a["name"]: a for a in cur.get("dataset_artifacts") or []}
    blobs: dict[str, bytes] = {}
    for name in REQUIRED:
        art = arts.get(name)
        blob = sb.download(CANDIDATE_BUCKET, art["storage_path"]) if art else None
        if blob is None or sha256(blob) != art["sha256"]:
            print(f"✗ {name} : artefact absent ou empreinte différente — export abandonné, rien n'est écrit.")
            return 1
        blobs[name] = blob
    data_dir.mkdir(parents=True, exist_ok=True)
    for name, blob in blobs.items():
        (data_dir / f".{name}.incoming").write_bytes(blob)
    for name in blobs:
        os.replace(data_dir / f".{name}.incoming", data_dir / name)
    print(f"✓ version {cur['provider_version']} exportée dans {data_dir}.")
    _emit(current_version=cur["provider_version"])
    return 0


def _emit(**values: str) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            fh.write("".join(f"{k}={v}\n" for k, v in values.items()))


# ── Repli ─────────────────────────────────────────────────────────────────
def rollback(sb: SupabaseRest, provider_version: str) -> int:
    version = find_version(sb, provider_version)
    if not version:
        print(f"✗ version {provider_version} inconnue.")
        return 2
    result = sb.rpc("restore_dataset_version", {"p_version_id": version["id"]})
    print(f"✓ version {provider_version} restaurée ({result}).")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("ingest")
    sub.add_parser("publish-pending")
    sub.add_parser("reconcile")
    sub.add_parser("export-current")
    p_rollback = sub.add_parser("rollback")
    p_rollback.add_argument("--version", required=True)
    for p in sub.choices.values():
        p.add_argument("--data-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args(argv)

    if os.environ.get("SOB_SUPABASE_SYNC", "").strip() != "true":
        # Pas de faux succès : en exécution automatisée, une configuration
        # absente est une erreur explicite (code 78). SOB_ALLOW_NO_SYNC=true
        # garde l'ancien comportement pour un essai local.
        print("SOB_SUPABASE_SYNC n'est pas « true » : aucune écriture Supabase n'a été faite.")
        return 0 if os.environ.get("SOB_ALLOW_NO_SYNC", "").strip() == "true" else 78
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_SECRET_KEY") if not os.environ.get(k, "").strip()]
    if missing and argv is None:
        print(f"✗ configuration manquante : {', '.join(missing)}")
        return 78
    try:
        sb = SupabaseRest()
        if args.cmd == "ingest":
            return ingest(sb, args.data_dir)
        if args.cmd == "publish-pending":
            return publish_pending(sb)
        if args.cmd == "reconcile":
            return reconcile(sb, args.data_dir)
        if args.cmd == "export-current":
            return export_current(sb, args.data_dir)
        return rollback(sb, args.version)
    except (SupabaseError, ValueError) as exc:
        print(f"✗ {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
