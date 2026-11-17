"""source_manifest.py — manifeste Open Dev Data (Electric Capital).

Format vérifié dans le client officiel (github.com/electric-capital/open-dev-data,
src/open_dev_data/download.py) :

    {"dataset": {"version": "...", "resources": [
        {"path": "<relatif ou absolu>", "size_bytes": 123, "b3sum": "<blake3>"}, ...]}}

Les chemins relatifs se résolvent par rapport à l'URL du manifeste. Aucune URL
de ressource n'est construite à la main : elles viennent toutes du manifeste.

Ce module ne télécharge jamais les Parquet en entier, sauf vérification blake3
explicitement demandée (SOB_VERIFY_B3=true, paquet « blake3 » installé).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import PurePosixPath
from urllib.parse import urljoin, urlparse

import requests

MANIFEST_URL = "https://data.opendevdata.org/manifest.json"
# Hôtes de distribution acceptés pour le manifeste et ses ressources.
ALLOWED_HOSTS = frozenset({"data.opendevdata.org", "data.developerreport.com"})
# Tables Parquet utilisées par build_data.py (nom de fichier sans extension).
SOB_TABLES = (
    "ecosystems",
    "canonical_developer_locations",
    "canonical_developers",
    "eco_mads",
    "eco_developer_activities",
    "developer_activities",
)
VERSION_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
MAX_MANIFEST_BYTES = 2_000_000


class ManifestError(RuntimeError):
    """Manifeste absent, invalide ou ressource non conforme."""


def _check_url(url: str) -> str:
    u = urlparse(url)
    if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS or u.username or u.password or u.port:
        raise ManifestError(f"URL de ressource refusée : {url!r}")
    return url


def parse_manifest(raw: bytes | str) -> dict:
    """Valide la structure minimale du manifeste et renvoie l'objet JSON."""
    try:
        doc = json.loads(raw)
    except (ValueError, TypeError) as exc:
        raise ManifestError(f"manifeste illisible : {exc}") from exc
    dataset = doc.get("dataset") if isinstance(doc, dict) else None
    if not isinstance(dataset, dict):
        raise ManifestError("manifeste sans objet « dataset »")
    version = str(dataset.get("version") or "")
    if not VERSION_RE.match(version):
        raise ManifestError(f"version de manifeste inattendue : {version!r}")
    resources = dataset.get("resources")
    if not isinstance(resources, list) or not resources:
        raise ManifestError("manifeste sans ressources")
    for r in resources:
        if not isinstance(r, dict) or not isinstance(r.get("path"), str) or not r["path"]:
            raise ManifestError("ressource sans chemin")
    return doc


def fetch_manifest(session: requests.Session | None = None, url: str = MANIFEST_URL) -> dict:
    """Télécharge le manifeste (HTTPS, hôte attendu, sans redirection, taille bornée)."""
    _check_url(url)
    http = session or requests
    try:
        r = http.get(url, timeout=60, allow_redirects=False)
    except requests.RequestException as exc:
        raise ManifestError(f"manifeste inaccessible : {exc}") from exc
    if r.status_code != 200:
        raise ManifestError(f"manifeste indisponible (HTTP {r.status_code})")
    if len(r.content) > MAX_MANIFEST_BYTES:
        raise ManifestError("manifeste anormalement volumineux")
    return parse_manifest(r.content)


def version_of(manifest: dict) -> str:
    return str(manifest["dataset"]["version"])


def table_resources(manifest: dict, tables: list[str] | tuple[str, ...], manifest_url: str = MANIFEST_URL) -> dict[str, dict]:
    """Ressource Parquet de chaque table utilisée : URL résolue, taille, empreinte.

    Une table absente ou présente plusieurs fois est une erreur : le pipeline
    ne devine jamais un chemin.
    """
    found: dict[str, dict] = {}
    for r in manifest["dataset"]["resources"]:
        name = PurePosixPath(urlparse(r["path"]).path).name
        if not name.endswith(".parquet"):
            continue
        table = name[: -len(".parquet")]
        if table not in tables:
            continue
        if table in found:
            raise ManifestError(f"table {table!r} présente plusieurs fois dans le manifeste")
        size = r.get("size_bytes")
        found[table] = {
            "table": table,
            "path": r["path"],
            "url": _check_url(urljoin(manifest_url, r["path"])),
            "size_bytes": size if isinstance(size, int) and size >= 0 else None,
            "b3sum": r.get("b3sum") if isinstance(r.get("b3sum"), str) else None,
        }
    missing = [t for t in tables if t not in found]
    if missing:
        raise ManifestError(f"tables absentes du manifeste : {', '.join(missing)}")
    return found


def fingerprint(manifest: dict, tables: list[str] | tuple[str, ...]) -> str:
    """SHA-256 stable de (version, ressources utilisées). Change si le fournisseur
    corrige un fichier sans changer de numéro de version (taille ou blake3)."""
    res = table_resources(manifest, tables)
    payload = {
        "version": version_of(manifest),
        "resources": [[t, res[t]["path"], res[t]["size_bytes"], res[t]["b3sum"]] for t in sorted(res)],
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def manifest_summary(manifest: dict) -> dict:
    """Empreinte du manifeste ENTIER et liste de ses ressources : permet de
    journaliser un changement du manifeste ou l'apparition d'une ressource,
    même quand les fichiers utilisés par BIB n'ont pas changé."""
    resources = sorted(
        (str(r["path"]), r.get("size_bytes"), r.get("b3sum")) for r in manifest["dataset"]["resources"]
    )
    digest = hashlib.sha256(json.dumps([version_of(manifest), resources], separators=(",", ":")).encode()).hexdigest()
    return {
        "manifest_hash": digest,
        "resource_count": len(resources),
        "resource_names": sorted({PurePosixPath(urlparse(p).path).name for p, _, _ in resources})[:500],
    }


def verify_resources(resources: dict[str, dict], session: requests.Session | None = None) -> list[str]:
    """Contrôle d'intégrité avant traitement. Renvoie la liste des anomalies.

    · toujours : requête HEAD, statut 200 et taille égale à size_bytes ;
    · SOB_VERIFY_B3=true : téléchargement complet et comparaison blake3
      (coûteux : à réserver aux vérifications manuelles).
    """
    http = session or requests
    problems: list[str] = []
    full = os.environ.get("SOB_VERIFY_B3", "").strip() == "true"
    for table, r in sorted(resources.items()):
        try:
            head = http.head(r["url"], timeout=60, allow_redirects=False)
        except requests.RequestException as exc:
            problems.append(f"{table}: ressource inaccessible ({exc})")
            continue
        if head.status_code != 200:
            problems.append(f"{table}: ressource indisponible (HTTP {head.status_code})")
            continue
        length = head.headers.get("content-length")
        if r["size_bytes"] is not None and length is not None and int(length) != r["size_bytes"]:
            problems.append(f"{table}: taille {length} différente du manifeste ({r['size_bytes']})")
        if full and r["b3sum"]:
            try:
                import blake3  # type: ignore
            except ImportError:
                problems.append("vérification blake3 demandée mais paquet « blake3 » absent")
                break
            h = blake3.blake3()
            with http.get(r["url"], timeout=600, stream=True, allow_redirects=False) as resp:
                for chunk in resp.iter_content(1 << 20):
                    h.update(chunk)
            if h.hexdigest() != r["b3sum"]:
                problems.append(f"{table}: empreinte blake3 différente du manifeste")
    return problems
