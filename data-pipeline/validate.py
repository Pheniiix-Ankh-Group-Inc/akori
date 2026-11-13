"""validate.py — contrôles de schéma et de cohérence des JSON State of BIB.

Utilisé par build_data.py avant de remplacer les fichiers publiés, et par
publish_supabase.py avant tout envoi vers Supabase. Aucun accès réseau.

    python validate.py [dossier]   # défaut : ../public/data
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REQUIRED = (
    "meta.json",
    "headline.json",
    "country_map.json",
    "top_cities.json",
    "ecosystem_mix.json",
    "tenure_cohort.json",
)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
ISO3_RE = re.compile(r"^[A-Z]{3}$")


def _is_count(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v >= 0


def validate_output_dir(directory: Path) -> list[str]:
    errors: list[str] = []
    data = {}
    for name in REQUIRED:
        path = directory / name
        if not path.exists():
            errors.append(f"{name}: fichier manquant")
            continue
        try:
            data[name] = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            errors.append(f"{name}: JSON invalide ({exc})")
    if errors:
        return errors

    meta = data["meta.json"]
    if not isinstance(meta.get("dataset_version"), str) or not meta["dataset_version"]:
        errors.append("meta.json: dataset_version manquant")
    source = meta.get("source") or {}
    if not source.get("name") or not source.get("license"):
        errors.append("meta.json: source.name et source.license requis (attribution)")

    headline = data["headline.json"]
    for key in ("devs_active_28d", "ecosystems", "countries", "commits_lifetime"):
        if not _is_count(headline.get(key)):
            errors.append(f"headline.json: {key} doit être un entier ≥ 0")
    if headline.get("cities") is not None and not _is_count(headline.get("cities")):
        errors.append("headline.json: cities doit être un entier ≥ 0 ou null")
    if not isinstance(headline.get("snapshot_date"), str) or not DATE_RE.match(headline["snapshot_date"]):
        errors.append("headline.json: snapshot_date au format AAAA-MM-JJ requis")

    countries = data["country_map.json"]
    if not isinstance(countries, list) or not countries:
        errors.append("country_map.json: liste non vide attendue")
    else:
        seen = set()
        for i, c in enumerate(countries):
            iso = c.get("iso_a3")
            if not isinstance(iso, str) or not ISO3_RE.match(iso):
                errors.append(f"country_map.json[{i}]: iso_a3 invalide")
            elif iso in seen:
                errors.append(f"country_map.json: doublon {iso}")
            seen.add(iso)
            if not _is_count(c.get("devs_active_28d")):
                errors.append(f"country_map.json[{i}]: devs_active_28d invalide")
        if _is_count(headline.get("countries")) and len(seen) > 0:
            active = sum(1 for c in countries if _is_count(c.get("devs_active_28d")))
            if active < 1:
                errors.append("country_map.json: aucun pays actif")
        total = sum(c.get("devs_active_28d", 0) for c in countries if _is_count(c.get("devs_active_28d")))
        if _is_count(headline.get("devs_active_28d")) and total and total < headline["devs_active_28d"] * 0.5:
            errors.append("cohérence: la somme par pays est très inférieure au total actif")

    cities = data["top_cities.json"]
    if not isinstance(cities, list):
        errors.append("top_cities.json: liste attendue")
    else:
        values = [c.get("devs_active_28d") for c in cities]
        if any(not _is_count(v) for v in values):
            errors.append("top_cities.json: devs_active_28d invalide")
        elif values != sorted(values, reverse=True):
            errors.append("top_cities.json: classement non trié")

    for name in ("ecosystem_mix.json", "tenure_cohort.json"):
        obj = data[name]
        months = obj.get("months") if isinstance(obj, dict) else None
        if not isinstance(months, list) or not months or not all(isinstance(m, str) and MONTH_RE.match(m) for m in months):
            errors.append(f"{name}: months au format AAAA-MM requis")
        elif months != sorted(months):
            errors.append(f"{name}: months non triés")

    return errors


def main() -> int:
    directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "public" / "data"
    errors = validate_output_dir(directory)
    if errors:
        for e in errors:
            print(f"✗ {e}")
        return 1
    print(f"✓ {directory} valide")
    return 0


if __name__ == "__main__":
    sys.exit(main())
