"""validate.py — contrôles de schéma et de cohérence des JSON State of BIB.

Utilisé par build_data.py avant de remplacer les fichiers publiés, et par
publish_supabase.py avant tout envoi vers Supabase. Aucun accès réseau.

    python validate.py [dossier]   # défaut : ../data/state-of-bib/current
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


def consistency_anomalies(directory: Path) -> list[str]:
    """Contrôles CROISÉS entre fichiers d'un même lot (aucune correction).

    Un lot cohérent produit par build_data.py doit vérifier :
      · headline.countries = nombre de pays de country_map (pays ayant au
        moins un développeur dans le périmètre, mêmes définitions que
        build_data.query_headline / query_country_map) ;
      · headline.devs_active_28d = somme des développeurs actifs par pays
        (un développeur n'a qu'une localisation) ;
      · headline.commits_lifetime = somme des commits par pays ;
      · aucune ville ne compte plus de développeurs que son pays ;
      · ecosystem_mix et tenure_cohort couvrent les mêmes mois, sans valeur
        manquante ni négative, et se terminent au plus tard au mois de
        l'instantané ;
      · meta.json porte pipeline_version (lot produit par ce pipeline).
    Renvoie la liste des écarts ; vide si le lot est cohérent.
    """
    load = lambda n: json.loads((directory / n).read_text())  # noqa: E731
    meta, headline, countries = load("meta.json"), load("headline.json"), load("country_map.json")
    cities, eco, cohort = load("top_cities.json"), load("ecosystem_mix.json"), load("tenure_cohort.json")
    out: list[str] = []

    if headline.get("countries") != len(countries):
        out.append(f"headline.countries={headline.get('countries')} mais {len(countries)} pays dans country_map")
    devs = sum(c.get("devs_active_28d") or 0 for c in countries)
    if headline.get("devs_active_28d") != devs:
        out.append(f"headline.devs_active_28d={headline.get('devs_active_28d')} mais somme par pays={devs}")
    commits = sum(c.get("commits_lifetime") or 0 for c in countries)
    if headline.get("commits_lifetime") != commits:
        out.append(f"headline.commits_lifetime={headline.get('commits_lifetime')} mais somme par pays={commits}")

    by_iso = {c.get("iso_a3"): c.get("devs_active_28d") or 0 for c in countries}
    per_country: dict[str, int] = {}
    for c in cities:
        per_country[c.get("iso_a3")] = per_country.get(c.get("iso_a3"), 0) + (c.get("devs_active_28d") or 0)
    for iso, n in per_country.items():
        if n > by_iso.get(iso, 0):
            out.append(f"top_cities: {n} développeurs pour {iso}, plus que le pays ({by_iso.get(iso, 0)})")
    ranks = [c.get("rank") for c in cities]
    if ranks != list(range(1, len(cities) + 1)):
        out.append("top_cities: rangs non consécutifs")

    if eco.get("months") != cohort.get("months"):
        out.append("ecosystem_mix et tenure_cohort ne couvrent pas les mêmes mois")
    months = eco.get("months") or []
    for e in eco.get("ecosystems") or []:
        series = e.get("series_devs") or []
        if len(series) != len(months):
            out.append(f"ecosystem_mix: série {e.get('name')} de longueur {len(series)} ≠ {len(months)} mois")
        if any(v is None or (isinstance(v, (int, float)) and v < 0) for v in series):
            out.append(f"ecosystem_mix: série {e.get('name')} avec valeur manquante ou négative")
    for key in ("devs_0_1y", "devs_1_2y", "devs_2y_plus"):
        series = cohort.get(key) or []
        if len(series) != len(cohort.get("months") or []):
            out.append(f"tenure_cohort: {key} de longueur incohérente")
        if any(v is None or v < 0 for v in series):
            out.append(f"tenure_cohort: {key} avec valeur manquante ou négative")
    snap = str(headline.get("snapshot_date") or "")[:7]
    if months and snap and months[-1] > snap:
        out.append(f"séries au-delà de l'instantané ({months[-1]} > {snap})")

    # Doublons, ordre et dates.
    seen_cities: set[tuple] = set()
    for c in cities:
        key = (str(c.get("city") or "").strip().lower(), c.get("iso_a3"))
        if key in seen_cities:
            out.append(f"top_cities: doublon {c.get('city')} ({c.get('iso_a3')})")
        seen_cities.add(key)
        if c.get("iso_a3") not in by_iso:
            out.append(f"top_cities: {c.get('city')} rattachée à un pays absent de country_map ({c.get('iso_a3')})")
    for label, ms in (("ecosystem_mix", months), ("tenure_cohort", cohort.get("months") or [])):
        if ms != sorted(set(ms)):
            out.append(f"{label}: mois non strictement croissants ou en double")
    eco_ids = [e.get("id") for e in eco.get("ecosystems") or []]
    if len(eco_ids) != len(set(eco_ids)):
        out.append("ecosystem_mix: écosystème en double")
    from datetime import date, timedelta

    try:
        if date.fromisoformat(str(headline.get("snapshot_date"))) > date.today() + timedelta(days=1):
            out.append("headline: snapshot_date dans le futur")
    except ValueError:
        out.append("headline: snapshot_date illisible")
    fp = meta.get("source_fingerprint")
    if fp is not None and not re.fullmatch(r"[0-9a-f]{64}", str(fp)):
        out.append("meta.json: source_fingerprint invalide")

    # Recalcul indépendant (build_data.query_verification) : s'il est présent,
    # il doit confirmer les totaux publiés.
    ver = meta.get("verification")
    if isinstance(ver, dict):
        for key in ("devs_active_28d", "commits_lifetime", "countries"):
            if key in ver and ver[key] != headline.get(key):
                out.append(f"recalcul indépendant : {key} publié {headline.get(key)} mais recalculé {ver[key]}")
    # Périmètre : uniquement des régions attendues.
    bad_regions = sorted({str(c.get("region")) for c in countries if c.get("region") not in ("Africa", "Caribbean")})
    if bad_regions:
        out.append(f"country_map: régions hors périmètre {bad_regions}")

    if not meta.get("pipeline_version"):
        out.append("meta.json sans pipeline_version : lot non produit par ce pipeline (provenance à confirmer)")
    return out


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    directory = Path(args[0]) if args else Path(__file__).resolve().parent.parent / "data" / "state-of-bib" / "current"
    errors = validate_output_dir(directory)
    if errors:
        for e in errors:
            print(f"✗ {e}")
        return 1
    print(f"✓ {directory} valide (schéma)")
    if "--consistency" in sys.argv:
        anomalies = consistency_anomalies(directory)
        for a in anomalies:
            print(f"⚠ {a}")
        if anomalies:
            print(f"✗ {len(anomalies)} incohérence(s) entre fichiers")
            return 3
        print("✓ cohérence entre fichiers")
    return 0


if __name__ == "__main__":
    sys.exit(main())
