# Versions et releases

Chaque version de Black in Blockchain porte un numéro `x.y.z` ([SemVer](https://semver.org/lang/fr/)), un tag Git `vx.y.z` sur `main` et une release GitHub dont les notes viennent de `CHANGELOG.md`.

## Au quotidien

Chaque PR fusionnée dans `develop` ajoute ses lignes sous `## [Unreleased]` dans `CHANGELOG.md` (format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) : `### Added`, `### Changed`, `### Fixed`, `### Security`…).

Choix du numéro :

| Changement | Exemple | Numéro |
| --- | --- | --- |
| Correctifs uniquement | coquille, bug d'affichage | `0.14.0` → `0.14.1` |
| Nouvelle page ou fonctionnalité | Startup Spotlight | `0.14.0` → `0.15.0` |
| Rupture (URL supprimées, refonte des données) | — | `0.x` → `1.0.0` |

## Publier une version

1. **Préparer.** GitHub → Actions → **Release — versions, tags et notes** → *Run workflow*, action `preparer`, version `x.y.z`.
   - Le workflow part de `develop`, transforme `[Unreleased]` en `## [x.y.z] — AAAA-MM-JJ`, met `package.json` à `x.y.z` et ouvre la PR `release: vx.y.z` vers `develop`.
   - Variante locale : `pnpm release:prepare x.y.z`, puis commit et PR à la main.
   - Si les Actions n'ont pas le droit d'ouvrir des PR (Settings → Actions → General → *Allow GitHub Actions to create and approve pull requests*), le workflow pousse quand même la branche `release/vx.y.z` et donne le lien pour ouvrir la PR.
2. **Livrer.** Fusionner la PR de version dans `develop`, puis `develop` dans `main` comme d'habitude.
3. **Publier (automatique).** Dès que `package.json` change sur `main`, le workflow crée le tag `vx.y.z` sur ce commit et la release GitHub avec les notes de la section `[x.y.z]`.
   - Si le tag existe déjà, rien n'est fait. Un tag n'est jamais déplacé.
   - En cas d'échec, relancer : *Run workflow* sur `main`, action `publier`.

Vérifier les notes avant de préparer : `pnpm release:notes x.y.z` affiche la section d'une version déjà préparée.

## Règles

- Jamais de push direct sur `main` : la version passe par une PR, comme tout le reste.
- Le numéro doit être supérieur à la dernière version connue (CHANGELOG et `package.json`) ; une section `[Unreleased]` vide est refusée.
- Les versions jusqu'à `0.13.0` sont un historique sans tag. La première version étiquetée est `0.14.0` (`FIRST_MANAGED_VERSION` dans `scripts/release/changelog.mjs`) ; aucune version antérieure n'est étiquetée après coup.
- Revenir en arrière : Vercel → Deployments → *Instant Rollback* sur le déploiement de la version précédente ; le tag indique quel commit correspond à quelle version.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `.github/workflows/release.yml` | Préparation (manuelle) et publication (automatique) |
| `scripts/release/changelog.mjs` | Lecture et transformation du CHANGELOG |
| `scripts/release/prepare.mjs` | `pnpm release:prepare x.y.z` |
| `scripts/release/notes.mjs` | `pnpm release:notes x.y.z` |
| `tests/unit/release-changelog.test.ts` | Tests du mécanisme |
