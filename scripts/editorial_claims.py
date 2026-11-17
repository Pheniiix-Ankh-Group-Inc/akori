#!/usr/bin/env python3
"""Génère docs/EDITORIAL_CLAIMS.md : inventaire des affirmations factuelles de
l'accueil (fr/en/es) à faire confirmer par une personne.

Heuristique volontairement large (chiffres, dates de fondation, événements
annoncés, tiers nommés). Un élément listé n'est PAS nécessairement faux : il
n'est simplement pas sourcé dans le dépôt. Usage : python3 scripts/editorial_claims.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MESSAGES = ROOT / "src" / "messages"
OUT = ROOT / "docs" / "EDITORIAL_CLAIMS.md"

# Sections présentes dans les messages mais rendues par aucune page.
NOT_RENDERED = {"Corridors"}

HOME_SECTIONS = ["Hero", "Marquee", "Manifesto", "Constellation", "Cosmic", "Ledger", "Pillars", "Data", "Orgs",
                 "News", "Portraits", "Chains", "Gathering", "Corridors", "Stats", "Cta", "Ticker", "Footer"]


def load_claims_registry() -> tuple[set[str], set[str]]:
    src = (ROOT / "src" / "lib" / "content" / "claims.ts").read_text(encoding="utf-8")
    block = src[src.index("UNVERIFIED_SECTIONS = [") : src.index("] as const")]
    sections = set(re.findall(r'"([A-Za-z]+)"', block))
    keys = set(re.findall(r'^\s+"([A-Za-z]+\.[A-Za-z0-9.]+)":', src, re.M))
    return sections, keys


def walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f"{path}[{i}]")
    elif isinstance(obj, str):
        yield path, obj


def category(text: str) -> str | None:
    t = re.sub(r"<[^>]+>", "", text)
    if re.search(r"sommet|summit|billets|tickets|décembre|december|liste d'attente|waitlist", t, re.I):
        return "Annonce / événement"
    if re.search(r"fondé|founded|fundad[oa]|signé|signed", t, re.I):
        return "Date / historique"
    if re.search(r"\d+\s?%|\d[\d  ,.]*\s?(M\$|k\b|K\b|\+)|\d{1,3}[  ,.]\d{3}|\b\d{2,}\b", t):
        return "Chiffre"
    if re.search(r"Visiter|Visit|\.io|\.xyz|\.africa|\.com|\.network|\.archive", t):
        return "Tiers nommé / lien"
    return None


def main() -> None:
    fr = json.loads((MESSAGES / "fr.json").read_text(encoding="utf-8"))
    sections, keys = load_claims_registry()
    rows = []
    for section in HOME_SECTIONS:
        for path, text in walk(fr.get(section, {}), section):
            cat = category(text)
            if not cat:
                continue
            masked = section in sections or path in keys
            visibility = "non rendu" if section in NOT_RENDERED else ("masqué par défaut" if masked else "**affiché**")
            excerpt = re.sub(r"<[^>]+>", "", text).replace("|", "/").strip()
            rows.append((path, cat, visibility, excerpt[:140]))
    lines = [
        "# Inventaire éditorial — affirmations factuelles de l'accueil",
        "",
        "> Généré par `scripts/editorial_claims.py` à partir de `src/messages/fr.json`",
        "> (clés identiques en `en.json` et `es.json`). Ne pas éditer à la main.",
        "",
        "Aucun de ces éléments n'est sourcé dans le dépôt. Ils sont **masqués par",
        "défaut** lorsqu'ils figurent dans le registre `src/lib/content/claims.ts`",
        "(`HOME_SHOW_UNVERIFIED_SECTIONS=true` les réaffiche). Pour publier un élément",
        "durablement : obtenir la source, la consigner ici, puis le retirer du registre.",
        "Les éléments « affichés » restants sont de nature déclarative ou décorative",
        "(année de fondation, numéros de bloc) et restent à confirmer.",
        "",
        f"Total : {len(rows)} éléments — {sum(1 for r in rows if r[2] == 'masqué par défaut')} masqués par défaut, "
        f"{sum(1 for r in rows if r[2] == '**affiché**')} affichés (déclaratifs ou décoratifs), "
        f"{sum(1 for r in rows if r[2] == 'non rendu')} non rendus.",
        "",
        "| Clé | Catégorie | Visibilité par défaut | Extrait (FR) | Source / décision |",
        "|---|---|---|---|---|",
    ]
    lines += [f"| `{p}` | {c} | {v} | {e} | à confirmer |" for p, c, v, e in rows]
    lines += [
        "",
        "## Corrections appliquées",
        "",
        "- Jour d'envoi de la newsletter : « vendredi » corrigé en **mercredi 9 h, heure de Toronto**",
        "  (`Pillars.items.p9.text`, fr/en/es), conformément au cycle validé.",
        "",
        "## Points à arbitrer (non modifiés)",
        "",
        "- Pages légales : la marque « AnbaChain / ANBACHAIN » apparaît dans les conditions",
        "  d'utilisation. Le nom de l'entité juridique responsable doit être confirmé avant",
        "  toute correction ; aucune validation juridique n'est revendiquée.",
        "- Liens de navigation vers des sections masquées : l'ancre ne défile plus vers une",
        "  section absente (aucune refonte de navigation effectuée).",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} : {len(rows)} éléments")


if __name__ == "__main__":
    main()
