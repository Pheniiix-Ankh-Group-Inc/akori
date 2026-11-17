# State of BIB — propositions d'évolution (non implémentées)

Étude du 14 novembre 2026. Règle commune : les statistiques publiques Electric
Capital (CC BY 4.0) et toute donnée interne BIB restent **séparées** (sources,
fichiers, tables, libellés et pages distincts) ; aucune valeur n'est
interpolée ni présentée sans sa date et sa source.

| Évolution | Valeur pour le visiteur | Données nécessaires | Faisabilité | Complexité | Priorité |
| --- | --- | --- | --- | --- | --- |
| Fiche détaillée par pays (`/state_of_bib/pays/<iso>`) | Lien partageable par pays ; ancrage local ; référencement | Déjà présentes : `country_map.json` (3 métriques), `top_cities.json` ; aucune série temporelle par pays | Élevée (données existantes) | Faible à moyenne | **MVP** (sans historique) |
| Comparatif Afrique / Caraïbes | Lecture régionale immédiate (totaux, parts, rangs) | `country_map.json` agrégé par `region` ; pas d'historique régional | Élevée | Faible | **MVP** |
| ~~Export CSV/JSON~~ | **Abandonné** (décision produit du 15 novembre 2026) : le site ne propose aucun téléchargement de données ; les sources et licences sont présentées sur la page légale | — | — | — | — |
| Historique de croissance par écosystème | Tendance longue au-delà de 48 mois, ruptures | Séries mensuelles déjà dans `ecosystem_mix.json` (48 mois) ; au-delà : étendre `build_data.py`, versionner | Moyenne | Moyenne | Post-MVP |
| Animation géographique historique | Voir la diffusion dans le temps | **Absente de la source actuelle** : calculer une vraie série mensuelle par pays dans le pipeline (nouvelle requête, schéma, validation, archivage) ; ne jamais interpoler | Moyenne (dépend du volume Parquet) | Élevée | Post-MVP, après validation des données |
| Liens State of BIB ↔ événements ↔ articles | Passer d'un chiffre à une action (événement local, ressource) | Pays/ville sur les événements (déjà présents), étiquettes pays sur les futurs articles éducatifs | Moyenne | Moyenne | Post-MVP |
| Indicateurs communautaires BIB | Mesurer l'impact propre de BIB (participants, villes, rétrospectives) | Données internes (événements publiés, participants déclarés) — **page et section distinctes**, jamais fusionnées avec Electric Capital ; consentement et agrégation minimale | Moyenne | Moyenne | Post-MVP |

## Préalable à toute évolution

L'instantané publié (2026-04-18) échoue aux contrôles de cohérence
(`python data-pipeline/validate.py --consistency`) et n'a pas été produit par le
pipeline actuel. Toute nouvelle fonctionnalité de données doit attendre une
reconstruction vérifiée à partir de la dernière version Electric Capital.
