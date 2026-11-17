"""history.py — versions historiques identifiables des instantanés State of BIB.

Avant qu'un nouveau lot ne remplace data/state-of-bib/current, le lot en place est copié tel
quel dans data/state-of-bib/history/<dataset_version>/ avec ses empreintes SHA-256
(SHA256SUMS). L'index data/state-of-bib/history/index.json liste toutes les versions
archivées (date de l'instantané, date de génération, empreintes).
Aucun fichier n'est recalculé ni interpolé : seule une copie exacte est faite.

Usage manuel : python history.py            (archive le lot courant)
               python history.py --check    (vérifie les empreintes archivées)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
from paths import DATA_DIR, HISTORY_DIR  # noqa: E402
FILES = (
    "meta.json",
    "headline.json",
    "country_map.json",
    "top_cities.json",
    "ecosystem_mix.json",
    "tenure_cohort.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_index(history_dir: Path) -> dict:
    p = history_dir / "index.json"
    if p.exists():
        return json.loads(p.read_text())
    return {"description": "Versions archivées des données State of BIB (copies exactes).", "versions": []}


def archive_current(data_dir: Path = DATA_DIR, history_dir: Path = HISTORY_DIR) -> str | None:
    """Archive le lot courant ; renvoie sa version, ou None s'il n'y a rien à archiver.

    Idempotent : une version déjà archivée avec les mêmes empreintes n'est pas
    recopiée ; des empreintes différentes pour une même version sont refusées.
    """
    meta_path = data_dir / "meta.json"
    if not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text())
    version = str(meta.get("dataset_version") or "")
    if not version or "/" in version or version.startswith("."):
        raise ValueError(f"dataset_version invalide : {version!r}")
    missing = [f for f in FILES if not (data_dir / f).exists()]
    if missing:
        raise FileNotFoundError(f"lot incomplet, fichiers absents : {missing}")

    sums = {f: sha256(data_dir / f) for f in FILES}
    index = _load_index(history_dir)
    known = next((v for v in index["versions"] if v["dataset_version"] == version), None)
    if known:
        if known["sha256"] != sums:
            raise ValueError(f"version {version} déjà archivée avec d'autres empreintes : refus")
        return version

    target = history_dir / version
    target.mkdir(parents=True, exist_ok=True)
    for f in FILES:
        shutil.copyfile(data_dir / f, target / f)
    (target / "SHA256SUMS").write_text("".join(f"{sums[f]}  {f}\n" for f in FILES))

    headline = json.loads((data_dir / "headline.json").read_text())
    index["versions"].append(
        {
            "dataset_version": version,
            "snapshot_date": headline.get("snapshot_date"),
            "generated_at": meta.get("generated_at"),
            "source": (meta.get("source") or {}).get("name"),
            "license": (meta.get("source") or {}).get("license"),
            "sha256": sums,
        }
    )
    index["versions"].sort(key=lambda v: v["dataset_version"])
    history_dir.mkdir(parents=True, exist_ok=True)
    (history_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
    return version


def check(history_dir: Path = HISTORY_DIR) -> list[str]:
    """Vérifie que chaque version archivée correspond à ses empreintes."""
    errors: list[str] = []
    for v in _load_index(history_dir)["versions"]:
        folder = history_dir / v["dataset_version"]
        for f, expected in v["sha256"].items():
            p = folder / f
            if not p.exists():
                errors.append(f"{v['dataset_version']}/{f} absent")
            elif sha256(p) != expected:
                errors.append(f"{v['dataset_version']}/{f} : empreinte différente")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        errors = check()
        for e in errors:
            print(f"✗ {e}")
        print("✓ historique intègre" if not errors else "✗ historique corrompu")
        return 1 if errors else 0
    version = archive_current()
    print(f"✓ version archivée : {version}" if version else "rien à archiver")
    return 0


if __name__ == "__main__":
    sys.exit(main())
