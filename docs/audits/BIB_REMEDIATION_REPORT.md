# Rapport de remédiation — Black in Blockchain

- **Date** : 13 novembre 2026
- **Branche** : `feature/bib-architecture-cible-complete` (PR #32, non fusionnée)
- **HEAD vérifié avant intervention** : `b735c056b0257f16f1e382b3c5612fb431f3ec05`
  (identique à l'audit ; 10 commits sur `main`, aucun travail tiers à préserver
  au-delà de ceux-ci)
- **Exclusions respectées** : aucune refonte UI/UX ou de navigation, aucun
  déploiement de production, aucun envoi, aucune tâche planifiée activée, aucune
  opération sur une base Supabase distante, aucune donnée historique supprimée.

## A. Architecture réellement implémentée

| Composant | Responsabilité | Point de sécurité | Limite connue |
|---|---|---|---|
| Next.js 16 (App Router), Vercel | Site public FR/EN/ES, espace opérateurs | CSP dérivée du projet Supabase, en-têtes vérifiés en CI | `script-src 'unsafe-inline'` (pas de CSP à nonce) |
| Supabase PostgreSQL (8 migrations, 26 tables) | Contenus, habilitations, audit, State of BIB, newsletter | RLS partout, fonctions INVOKER/DEFINER auditées | Non appliqué sur un projet distant |
| Fonctions transactionnelles | Fiche + traductions + audit en une transaction | Verrou optimiste, transitions idempotentes | Storage hors transaction (compensation + rapport) |
| Supabase Storage (5 buckets) | Brouillons/preuves/candidates privés ; publics en lecture | Chemins imposés, signature binaire vérifiée | Copie déjà téléchargée non rappelable |
| Pipeline Python/DuckDB + GitHub Actions | Contrôle quotidien, candidate, PR, promotion | Promotion après fusion, empreintes SHA-256 vérifiées | Dépend du réglage GitHub « Actions can create PRs » |
| Brevo | Double opt-in, campagnes, désabonnements (source de vérité) | Preuve de demande tracée avant l'appel | Non testé contre Brevo réel |
| Moteur IA (fournisseur configurable) | Brouillons FR/EN | JSON + Zod, budgets, données externes isolées, contrôles hors LLM | Fournisseur non choisi ; non testé en réel |
| Veille RSS/Atom | Actualités autorisées | Garde-fous SSRF | DNS rebinding non totalement exclu |
| Exploitation | Incidents, alertes e-mail, journaux corrélés | Masquage des données sensibles | Alertes désactivées par défaut |

Flux détaillés : `docs/ARCHITECTURE.md`. Sécurité : `docs/SECURITY.md`.

## B. Inventaire des corrections

| ID | Prio. | Description | Cause racine | Fichiers | Correction | Risque résiduel | Test | État |
|---|---|---|---|---|---|---|---|---|
| P0.1 | P0 | CSP sans Supabase, Sanity résiduel, HSTS preload | CSP statique héritée | `next.config.ts`, `src/lib/security/headers.ts` | CSP construite depuis `NEXT_PUBLIC_SUPABASE_URL`, directives de durcissement, HSTS sans preload | `unsafe-inline` | `security-headers.test.ts`, étape CI « en-têtes servis » | Corrigé |
| P0.2 | P0 | `innerHTML` avec données (`SobMap`, `SobCohort`) | Gabarits HTML concaténés | `SobMap.tsx`, `SobCohort.tsx`, `src/lib/dom/safe.ts` | Nœuds texte, couleurs validées ; rendu identique | — | `dom-safe.test.ts` | Corrigé |
| P0.3 | P0 | Redirection Auth sur l'en-tête Host ; droits des fonctions | Origine de la requête | `auth/callback/route.ts`, migrations | Origine canonique ; matrice des fonctions vérifiée | — | `10_security_and_integrity.sql` | Corrigé |
| P0.4 | P0 | Écritures dépendantes non transactionnelles ; galerie supprimée avant insertion | Appels PostgREST séparés | migration 0006, actions événements/rétrospectives, `src/lib/editorial/rpc.ts`, formulaires (champ caché) | RPC transactionnelles, verrou optimiste, transitions idempotentes, validation avant mutation, compensation Storage | Fenêtre Storage ↔ base (rapport) | `10_security_and_integrity.sql` (traduction invalide, conflit, double clic, galerie intacte) | Corrigé |
| P0.5 | P0 | Médias : type déclaré seul, suppression fichiers avant fiche, pas de réconciliation | Confiance dans le navigateur | `medias/actions.ts`, `src/lib/media/{sniff,inspect,reconcile}.ts`, migration 0006, `/api/ops/media-report` | Signature binaire, ordre de suppression sûr, garde en base, politiques Storage, rapport lecture seule | Vidéos > 200 Mo non supportées | `media-sniff.test.ts`, tests SQL Storage | Corrigé |
| P0.6 | P0 | Version State of BIB activée avant revue de la PR | Publication dans le job de préparation | migration 0007, `publish_supabase.py`, `refresh-data.yml`, `sob-promote.yml` | Candidate privée → promotion après fusion avec empreintes → repli | Réglage GitHub requis | `20_sob_governance.sql`, `test_governance.py` | Corrigé |
| P0.7 | P0 | Reconstructions répétées, échecs infinis, exécutions concurrentes | Décision binaire | `check_version.py`, migration 0007 | Candidate non reconstruite, 3 échecs max, exécution unique, expiration des exécutions bloquées, version du manifeste validée | Licence de la source à revérifier périodiquement | `test_governance.py` | Corrigé |
| P0.8 | P0 | Affirmations non sourcées affichées, newsletter « vendredi » | Contenus hérités | `src/lib/content/claims.ts`, accueil, `Hero`, `Cta`, messages, `docs/EDITORIAL_CLAIMS.md` | Masquage par défaut (registre central), jour corrigé, inventaire généré | 8 éléments déclaratifs affichés à confirmer | `content-claims.test.ts` | Corrigé (validation humaine requise) |
| P1.1–P1.3 | P1 | Validation des migrations, RLS, fonctions privilégiées | Aucune exécution sur base vierge en CI | `supabase/tests/*`, job CI `sql` | Stub Supabase + 4 suites, CI sur PostgreSQL 16 | Stub ≠ Supabase réel (à rejouer sur staging) | 3 suites SQL | Corrigé |
| P1.4 | P1 | Transition du projet `akori` | Ancien schéma présent | `supabase/ops/*`, `docs/SUPABASE_MIGRATION_PLAN.md` | Préflight de conflits, inventaire lecture seule, plan de sauvegarde, modèle de nettoyage bloqué | Inventaire distant non revalidé (aucun accès) | Préflight testé localement | Préparé, **bloqué** |
| P1.5 | P1 | Limiteur contourné en cas de panne | Repli mémoire par instance | `rate-limit.ts`, `api/newsletter` | Échec fermé (503), compteur local borné en développement, IP validées | En-têtes IP fiables seulement derrière Vercel | `api-guards.test.ts` | Corrigé |
| P1.6 | P1 | Double opt-in réussi sans preuve enregistrée | Écriture après l'appel, erreur ignorée | migration 0008, `api/newsletter` | Preuve `pending` avant Brevo, états finaux, pas de nouvelle demande < 24 h, 502/503 honnêtes | Lignes `pending` à réconcilier (runbook) | `30_newsletter_integrity.sql` | Corrigé |
| P1.7 | P1 | Paire validée non atomique, fenêtre vérifiée une seule fois, cycle bloqué | Écritures séparées | migration 0008, `orchestrator.ts` | Validation atomique, immutabilité, envoi définitif, fenêtre revérifiée par langue, cycle interrompu figé | Envoi partiel possible (signalé, jamais rejoué) | `newsletter-schedule.test.ts`, `30_newsletter_integrity.sql` | Corrigé |
| P1.8 | P1 | Conseil financier, liens rédigés par le modèle | Contrôles incomplets | `checks.ts`, `compose.ts` | Deux contrôles bloquants, données délimitées comme non fiables | Heuristiques | `news-ai-ops.test.ts` | Corrigé |
| P1.9 | P1 | SSRF via URL de flux | `fetch` direct | `src/lib/net/*`, `ingest.ts` | https, DNS, redirections, taille, type, entités | DNS rebinding | `ssrf.test.ts` | Corrigé |
| P1.10 | P1 | IA : troncature, 429, budget de jetons | Appel unique non qualifié | `engine.ts`, `env.ts` | Détection, un nouvel essai borné, budget | Fournisseur réel non testé | `news-ai-ops.test.ts` | Corrigé |
| P1.11 | P1 | Observabilité | Journaux non structurés | `src/lib/ops/log.ts`, `incidents.ts`, routes cron | JSON corrélé, durée, statut, masquage | — | `news-ai-ops.test.ts` | Corrigé |
| P1.12 | P1 | CI limitée aux contrôles statiques | Consigne antérieure | `ci.yml`, `package.json` | Tests unitaires, pipeline, SQL, en-têtes servis | — | CI | Corrigé |

## C. Supabase

- **État actuel du projet `akori`** : non revalidé dans cette session — **aucun
  outil d'accès Supabase n'était disponible**. Constats de l'audit précédent
  (30 tables, 57 politiques, 9 comptes Auth, 2 buckets, aucune table BIB) repris
  à titre indicatif dans `docs/SUPABASE_MIGRATION_PLAN.md`.
- **État cible** : 26 tables BIB, RLS sur toutes, 5 buckets `bib-*`,
  fonctions listées dans `docs/SECURITY.md` § 4.
- **Migrations ajoutées** : `20261113000600_editorial_integrity`,
  `20261113000700_sob_governance`, `20261113000800_newsletter_integrity`
  (additives ; nombre de tables inchangé).
- **Opérations réellement exécutées** : migrations 0001 → 0008 et tests sur
  PostgreSQL 16 **local et jetable** (stub Supabase) et sur le conteneur
  éphémère de la CI. Aucune autre.
- **Opérations bloquées, en attente d'autorisation** : inventaire distant
  (accès requis), sauvegarde + test de restauration, préflight sur `akori`,
  `supabase db push`, bootstrap du premier opérateur, tout nettoyage hérité.

## D. Tests et contrôles — résultats observés

| Commande | Environnement | Résultat observé |
|---|---|---|
| `pnpm lint` | local + CI `web` | 0 erreur |
| `pnpm typecheck` | local + CI `web` | 0 erreur |
| `pnpm test` (Vitest) | local + CI `web` | 8 fichiers, **85 tests réussis** |
| `next build` | CI `web` (Turbopack) ; local `--webpack` avec polices simulées (Google Fonts inaccessible dans le bac à sable) | Succès ; 56 pages |
| En-têtes servis (`next start` + `curl`) | local + CI `web` | CSP attendue, HSTS sans preload, `nosniff`, pas de `X-Powered-By` |
| `pnpm audit --prod` | local + CI `web` | No known vulnerabilities found |
| `python -m unittest discover -s data-pipeline/tests` | local + CI `data` | **8 tests OK** |
| `validate.py public/data`, `py_compile`, `pglast` (migrations) | local + CI `data` | OK |
| `supabase/tests/run.sh` | local (PG 16 jetable) + CI `sql` (PG 16 conteneur) | Préflight sans conflit ; 8 migrations ; suites sécurité/intégrité (57 assertions), gouvernance State of BIB, newsletter : **toutes réussies** |
| Routes clés sur le build local | local | `/`, `/fr`, `/evenements`, `/en-action`, `/state_of_bib`, `/login` 200 ; `/admin` 307 ; `/api/ops/media-report` 401 ; `/api/newsletter` 503 « disabled » |

CI GitHub Actions sur `381d6f4` : jobs `web`, `data`, `sql` réussis
(exécution `43528733694`). Le résultat de la CI sur le dernier commit de
documentation est consigné dans la description de la PR #32.

**Non exécuté** (staging BIB requis, voir `docs/TEST_PLAN.md` § 3) : connexion
réelle, import réel avec CSP en navigateur, double opt-in Brevo, appel IA,
préparation/promotion State of BIB contre Supabase, rapport médias sur données
réelles.

## E. Exploitation

- **Drapeaux** : tous `false` par défaut ; contenus non sourcés masqués.
- **Livraison** : staging BIB (Preview) → recette `docs/TEST_PLAN.md` § 3 →
  migration de production selon `docs/SUPABASE_MIGRATION_PLAN.md` → activation
  progressive (`docs/DEPLOYMENT.md` § 9-10).
- **Dépendances externes** : Supabase BIB, Brevo, fournisseur IA, GitHub
  Actions (variables `BIB_SCHEDULES_ENABLED`, `SOB_SUPABASE_SYNC`).
- **Surveillance, incidents, reprise** : `docs/OPERATIONS_RUNBOOK.md`.
- **Retour arrière** : déploiement Vercel précédent ; drapeaux à `false` ;
  `rollback_dataset_version` pour State of BIB ; restauration de la sauvegarde
  pour la base.

## Décisions requises du propriétaire

1. **Accès Supabase** au projet `akori` (lecture) pour revalider l'inventaire,
   puis autorisation explicite du plan de sauvegarde et du diff SQL avant toute
   migration distante.
2. **Projet de staging BIB** distinct (création = ressource potentiellement
   payante).
3. **Nettoyage de l'ancien schéma** d'`akori` : liste exacte et accord écrit.
4. **Contenus** : sources des éléments de `docs/EDITORIAL_CLAIMS.md` ; nom de
   l'entité juridique dans les conditions d'utilisation (« AnbaChain »).
5. **HSTS preload** : à décider par le propriétaire du domaine.
6. **Fournisseur IA** et budget ; activation des envois réels.
7. Réglage GitHub « Allow GitHub Actions to create and approve pull requests ».
