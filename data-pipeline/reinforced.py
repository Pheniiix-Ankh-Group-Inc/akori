"""reinforced.py — contrôles renforcés AUTOMATIQUES d'une version State of BIB.

Déclenchés quand un indicateur total varie fortement par rapport à la version
courante. Une forte variation n'exige plus d'approbation humaine : la version
est publiée si ces contrôles confirment sa cohérence ; sinon elle est mise en
quarantaine (la dernière version valide reste en ligne) et sera retentée
automatiquement quand les données ou les conditions changent.

Aucun accès réseau ici : le lot candidat est lu sur disque, la version
précédente est fournie par l'appelant (observations et artefacts).
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from statistics import median

# Bornes au-delà desquelles une variation est tenue pour manifestement invalide.
MAX_RATIO = 10.0            # un total multiplié ou divisé par plus de 10
MAX_LIFETIME_DROP = 0.5     # un cumul « depuis toujours » qui perd plus de la moitié
MAX_COUNTRY_LOSS = 0.5      # plus de la moitié des pays disparaît
HISTORY_MEDIAN_DRIFT = 0.2  # dérive médiane tolérée sur les mois déjà publiés
HISTORY_REWRITE_SHARE = 0.25  # part maximale de mois fortement réécrits
LOCAL_DELTA_SHARE = 0.9     # part de la variation portée par un seul pays…
LOCAL_FACTOR = 5.0          # …dont la valeur a elle-même été multipliée par 5
RECENT_MONTHS_IGNORED = 2   # les derniers mois peuvent être légitimement révisés


def _check(name: str, passed: bool, detail: str) -> dict:
    return {"name": name, "passed": bool(passed), "detail": detail[:300]}


def _load(data_dir: Path, name: str):
    return json.loads((data_dir / name).read_text())


def _months_contiguous(months: list[str]) -> bool:
    for a, b in zip(months, months[1:]):
        ya, ma = int(a[:4]), int(a[5:7])
        yb, mb = int(b[:4]), int(b[5:7])
        if (yb * 12 + mb) - (ya * 12 + ma) != 1:
            return False
    return True


def _overlap_drift(new_months, new_series, old_months, old_series) -> tuple[float | None, float | None, int]:
    """Dérive sur les mois communs (hors mois récents) : (médiane, part réécrite, nb de mois)."""
    old = dict(zip(old_months, old_series))
    common = [m for m in new_months if m in old][:-RECENT_MONTHS_IGNORED or None]
    diffs = []
    for m in common:
        n, o = new_series[new_months.index(m)], old[m]
        if o:
            diffs.append(abs(n - o) / o)
        elif n:
            diffs.append(1.0)
    if not diffs:
        return None, None, 0
    return median(diffs), sum(1 for d in diffs if d > 0.5) / len(diffs), len(diffs)


def reinforced_checks(data_dir: Path, previous: dict | None, strong: list[str], scope_iso: set[str] | None = None) -> dict:
    """Contrôles renforcés. `previous` (ou None) :
        {"version", "as_of_date", "totals": {...}, "countries": {iso: devs},
         "ecosystem_mix": {...} | None, "tenure_cohort": {...} | None}
    Renvoie {"passed", "checks": [...], "strong": [...]}.
    """
    meta, headline = _load(data_dir, "meta.json"), _load(data_dir, "headline.json")
    countries, cities = _load(data_dir, "country_map.json"), _load(data_dir, "top_cities.json")
    eco, cohort = _load(data_dir, "ecosystem_mix.json"), _load(data_dir, "tenure_cohort.json")
    checks: list[dict] = []

    # 1. Recalcul indépendant (fait par build_data.query_verification).
    ver = meta.get("verification")
    if not isinstance(ver, dict):
        checks.append(_check("recalcul_independant", False, "meta.verification absent : aucun recalcul indépendant disponible"))
    else:
        diff = [f"{k}: publié {headline.get(k)} / recalculé {ver.get(k)}"
                for k in ("devs_active_28d", "commits_lifetime", "countries") if ver.get(k) != headline.get(k)]
        checks.append(_check("recalcul_independant", not diff, "; ".join(diff) or "totaux confirmés par un second calcul"))

    # 2. Agrégats : totaux = somme des pays, par région, villes ≤ total.
    devs = sum(c.get("devs_active_28d") or 0 for c in countries)
    commits = sum(c.get("commits_lifetime") or 0 for c in countries)
    by_region: dict[str, int] = {}
    for c in countries:
        by_region[c.get("region")] = by_region.get(c.get("region"), 0) + (c.get("devs_active_28d") or 0)
    agg_ok = (devs == headline.get("devs_active_28d") and commits == headline.get("commits_lifetime")
              and sum(by_region.values()) == devs and sum(c.get("devs_active_28d") or 0 for c in cities) <= devs
              and all((c.get("commits_last_12m") or 0) <= (c.get("commits_lifetime") or 0) for c in countries))
    checks.append(_check("agregats", agg_ok, f"pays={devs}, régions={by_region}, total={headline.get('devs_active_28d')}"))

    # 3. Périmètre géographique.
    isos = {c.get("iso_a3") for c in countries}
    outside = sorted(i for i in isos if scope_iso is not None and i not in scope_iso)
    bad_region = sorted({str(c.get("region")) for c in countries if c.get("region") not in ("Africa", "Caribbean")})
    city_out = sorted({str(c.get("iso_a3")) for c in cities if c.get("iso_a3") not in isos})
    checks.append(_check("perimetre", not outside and not bad_region and not city_out,
                         f"hors périmètre={outside}, régions inattendues={bad_region}, villes sans pays={city_out}"))

    # 4. Périodes : instantané non antérieur à la version courante, séries
    #    continues, alignées et arrêtées au mois de l'instantané.
    snap = str(headline.get("snapshot_date") or "")
    months = eco.get("months") or []
    period_problems = []
    try:
        snap_date = date.fromisoformat(snap)
        if previous and previous.get("as_of_date") and snap_date < date.fromisoformat(str(previous["as_of_date"])):
            period_problems.append(f"instantané {snap} antérieur à la version courante ({previous['as_of_date']})")
    except ValueError:
        period_problems.append("date d'instantané illisible")
    if months != (cohort.get("months") or []):
        period_problems.append("écosystèmes et ancienneté sur des mois différents")
    if not _months_contiguous(months):
        period_problems.append("mois manquants dans les séries")
    if months and months[-1] != snap[:7]:
        period_problems.append(f"séries arrêtées à {months[-1]} alors que l'instantané est de {snap[:7]}")
    checks.append(_check("periodes", not period_problems, "; ".join(period_problems) or f"{len(months)} mois continus jusqu'à {snap[:7]}"))

    if previous:
        totals = previous.get("totals") or {}
        # 5. Bornes de vraisemblance.
        bounds = []
        for key in ("devs_active_28d", "commits_lifetime", "countries", "ecosystems"):
            old, new = totals.get(key), headline.get(key)
            if not old or not isinstance(new, (int, float)):
                continue
            ratio = new / old
            if ratio > MAX_RATIO or ratio < 1 / MAX_RATIO:
                bounds.append(f"{key} ×{ratio:.2f}")
        old_commits = totals.get("commits_lifetime")
        if old_commits and headline.get("commits_lifetime", 0) < old_commits * (1 - MAX_LIFETIME_DROP):
            bounds.append("cumul des commits en baisse de plus de 50 %")
        checks.append(_check("vraisemblance", not bounds, "; ".join(bounds) or "variations dans les bornes"))

        # 6. Répartition par pays : pas de disparition massive, pas de
        #    variation portée par un seul pays aberrant.
        prev_c = previous.get("countries") or {}
        if prev_c:
            new_c = {c["iso_a3"]: c.get("devs_active_28d") or 0 for c in countries}
            lost = [i for i in prev_c if i not in new_c]
            dist = []
            if len(lost) > len(prev_c) * MAX_COUNTRY_LOSS:
                dist.append(f"{len(lost)} pays sur {len(prev_c)} ont disparu")
            delta_total = sum(new_c.values()) - sum(prev_c.values())
            if delta_total:
                iso, delta = max(((i, new_c.get(i, 0) - prev_c.get(i, 0)) for i in set(new_c) | set(prev_c)), key=lambda x: abs(x[1]))
                old_v, new_v = prev_c.get(iso, 0), new_c.get(iso, 0)
                factor = (new_v / old_v) if old_v else float("inf") if new_v else 1.0
                if abs(delta) >= abs(delta_total) * LOCAL_DELTA_SHARE and (factor > LOCAL_FACTOR or factor < 1 / LOCAL_FACTOR) and len(new_c) > 3:
                    dist.append(f"variation portée par un seul pays ({iso} : {old_v} → {new_v})")
            checks.append(_check("repartition_pays", not dist, "; ".join(dist) or "variation répartie entre les pays"))
        else:
            checks.append(_check("repartition_pays", True, "aucune observation par pays pour la version précédente (non applicable)"))

        # 7. Historique : les mois déjà publiés ne doivent pas être réécrits.
        hist = []
        compared = 0
        prev_eco, prev_cohort = previous.get("ecosystem_mix"), previous.get("tenure_cohort")
        if prev_cohort and prev_cohort.get("months"):
            new_tot = [a + b + c for a, b, c in zip(cohort["devs_0_1y"], cohort["devs_1_2y"], cohort["devs_2y_plus"])]
            old_tot = [a + b + c for a, b, c in zip(prev_cohort["devs_0_1y"], prev_cohort["devs_1_2y"], prev_cohort["devs_2y_plus"])]
            med, share, n = _overlap_drift(cohort["months"], new_tot, prev_cohort["months"], old_tot)
            compared += n
            if med is not None and (med > HISTORY_MEDIAN_DRIFT or share > HISTORY_REWRITE_SHARE):
                hist.append(f"ancienneté : dérive médiane {med:.0%}, {share:.0%} des mois réécrits")
        if prev_eco and prev_eco.get("months"):
            old_by_id = {e.get("id"): e for e in prev_eco.get("ecosystems") or []}
            for e in eco.get("ecosystems") or []:
                o = old_by_id.get(e.get("id"))
                if not o:
                    continue
                med, share, n = _overlap_drift(months, e["series_devs"], prev_eco["months"], o["series_devs"])
                compared += n
                if med is not None and (med > HISTORY_MEDIAN_DRIFT or share > HISTORY_REWRITE_SHARE):
                    hist.append(f"{e.get('name')} : dérive médiane {med:.0%}, {share:.0%} des mois réécrits")
        checks.append(_check("historique", not hist, "; ".join(hist[:4]) or
                             (f"{compared} points mensuels déjà publiés confirmés" if compared else "aucun historique comparable (non applicable)")))

    return {"passed": all(c["passed"] for c in checks), "checks": checks, "strong": strong}
