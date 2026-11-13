# Black in Blockchain (BIB) — site et plateforme

Black in Blockchain est une communauté et un écosystème autour de la blockchain.
Ce dépôt (`akori`, héritage « AnbaChain ») contient le site public multilingue,
l'administration privée minimale et les traitements de données associés.

> Ce README décrit le code. Il ne définit ni la mission, ni le positionnement
> éditorial de BIB : les textes publics restent ceux validés par l'équipe.

## État du projet

| Module | État dans le code | Activation |
| --- | --- | --- |
| Site public FR/EN/ES (accueil, fondateurs, légal) | Opérationnel | — |
| Événements (base Supabase, liens Luma) | Implémenté | Projet Supabase BIB + migrations |
| BIB en action (rétrospectives, médias, témoignages) | Implémenté | Projet Supabase BIB + clé serveur |
| Administration privée (`/admin`) | Implémentée | Premier opérateur à initialiser |
| State of BIB (JSON) | Opérationnel | — |
| State of BIB historisé (Supabase) | Implémenté (candidate → revue → promotion vérifiée) | `SOB_SUPABASE_SYNC`, `FEATURE_SOB_READ_FROM_SUPABASE` |
| Inscription newsletter (double opt-in Brevo) | Implémentée | `FEATURE_NEWSLETTER_SUBSCRIBE` + Brevo |
| Veille actualités | Implémentée | `FEATURE_NEWS_INGEST` + sources autorisées |
| Moteur IA + newsletter autonome FR/EN | Implémentés | `FEATURE_AI`, `FEATURE_NEWSLETTER_AUTOSEND` |

**Aucun service n'est activé par défaut.** Les migrations ne sont appliquées
sur aucune base distante, aucune tâche planifiée n'est active, aucun e-mail
n'est envoyé tant que les drapeaux et la configuration ne sont pas en place.
Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Le design et la navigation existants sont conservés : les nouveaux écrans
réutilisent les classes et composants déjà présents. Une refonte visuelle est
différée (travaux UI/UX menés séparément).

Les modules dépendant d'un service externe (Supabase BIB, Brevo, IA) sont
**implémentés et testés localement, mais pas encore validés en conditions
réelles** : une recette sur un environnement de staging BIB isolé est requise
(voir [docs/TEST_PLAN.md](docs/TEST_PLAN.md)).

## Stack

| Couche | Technologie (version du dépôt) |
| --- | --- |
| Web | Next.js 16.4 (App Router), React 19.2, TypeScript 5 (strict) |
| UI | Tailwind CSS 4 + CSS existants (`globals.css`, `bib.css`, `state-of-bib.css`) |
| Langues | next-intl 4 — `en` (défaut, sans préfixe), `fr`, `es` |
| Base, auth, fichiers | Supabase (PostgreSQL, Auth, Storage) — projet BIB dédié |
| Newsletter | Brevo (API serveur) |
| Événements | Luma — liens d'inscription uniquement (aucune API) |
| Visualisations | D3, TopoJSON, world-atlas |
| Données | Python 3.12, DuckDB, pandas (`data-pipeline/`) |
| Planification / CI | GitHub Actions |
| Hébergement | Vercel |

Gestionnaire de paquets : **pnpm** (`pnpm-lock.yaml` uniquement). Node ≥ 20.9.

## Démarrer

```bash
pnpm install
cp .env.example .env.local   # valeurs factices : le site public fonctionne sans Supabase
pnpm dev                     # http://localhost:3000
```

Sans Supabase configuré, les pages Événements et BIB en action affichent un
état vide explicite, State of BIB lit les JSON de `public/data/`, et
l'administration est inaccessible.

Contrôles statiques :

```bash
pnpm lint
pnpm typecheck
pnpm build
python data-pipeline/validate.py public/data
```

## Routes

| Route | Description |
| --- | --- |
| `/`, `/fr`, `/es` | Accueil (sections existantes + blocs Événements, BIB en action, State of BIB, newsletter) |
| `/[locale]/evenements`, `/[locale]/evenements/[slug]` | Événements publiés : à venir, en cours, passés (« Terminé ») |
| `/[locale]/en-action`, `/[locale]/en-action/[slug]` | Rétrospectives, galerie, vidéo, témoignages |
| `/[locale]/state_of_bib` | Tableau de bord State of BIB |
| `/[locale]/fondateurs`, `/about`, `/mission`, `/terms`, `/privacy`, `/cookies` | Pages existantes conservées |
| `/[locale]/membership`, `/resources`, `/press`, `/contact` | Coquilles historiques conservées, non développées (hors périmètre) |
| `/login` | Connexion des opérateurs habilités (Supabase Auth) |
| `/register` | Page d'information : inscription publique fermée |
| `/dashboard` | Redirige vers `/admin` |
| `/admin/**` | Administration : événements, BIB en action, médias, témoignages, insights, suivi newsletter |
| `/api/newsletter` | Inscription newsletter (POST) |
| `/api/cron/news`, `/api/cron/newsletter` | Déclencheurs planifiés authentifiés par `CRON_SECRET` |

## Modules

- **Événements** — saisis dans l'administration, stockés dans Supabase. La
  catégorie « à venir / en cours / passé » est calculée depuis les dates. Le
  bouton « S'inscrire sur Luma » n'apparaît que si une URL Luma valide est
  renseignée. Aucune donnée de participants, billets ou paiements n'est stockée.
- **BIB en action** — rétrospectives, médias (Supabase Storage), témoignages
  avec référence de consentement. Les fichiers restent privés jusqu'à la
  publication d'un contenu qui les utilise ET l'approbation de leurs droits ;
  le retrait supprime la copie publique et invalide le cache.
- **State of BIB** — pipeline Python/DuckDB inchangé dans son calcul, avec
  validation avant publication, contrôle quotidien léger de version et
  historisation Supabase optionnelle. Les chiffres portent sur l'Afrique et
  les Caraïbes et ne mesurent pas la diaspora.
- **Newsletter** — 4 rubriques exactes (Blockchain Insights, Blockchain News,
  BIB Events, BIB Highlights), éditions FR et EN, cycle autonome
  lundi / mardi / mercredi 09:00 (America/Toronto), contrôles hors IA, blocage
  des deux langues en cas d'échec, annulation sans rattrapage, alertes e-mail.
- **Insights IA State of BIB** — brouillons uniquement ; publication sur le
  site par un administrateur.

Détails : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/DATA_MODEL.md](docs/DATA_MODEL.md),
[docs/EDITORIAL_WORKFLOWS.md](docs/EDITORIAL_WORKFLOWS.md).

## Accueil : contenus non sourcés

Les chiffres, annonces, historiques et organisations tierces de l'accueil qui
ne sont pas sourcés dans le dépôt sont **masqués par défaut** (sections
Constellation, Ledger, Pillars, Data, Orgs, News, Portraits, Chains, Gathering,
Stats, Ticker ; éléments « 37 chapitres » du bandeau et délai « 72 heures » de
l'appel à rejoindre). Registre central : `src/lib/content/claims.ts`.
`HOME_SHOW_UNVERIFIED_SECTIONS=true` les réaffiche sur décision éditoriale.
Inventaire à confirmer : [docs/EDITORIAL_CLAIMS.md](docs/EDITORIAL_CLAIMS.md)
(`python3 scripts/editorial_claims.py` pour le régénérer).

## Administration

Accès sur invitation uniquement. Procédure du premier opérateur :
[supabase/bootstrap/first_editor.sql](supabase/bootstrap/first_editor.sql) et
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#5-premier-opérateur).

## Variables d'environnement

Toutes les variables sont listées et commentées dans [.env.example](.env.example).
Les clés secrètes (Supabase secret, Brevo, IA, `CRON_SECRET`) sont
exclusivement côté serveur ; la CI vérifie qu'aucune n'apparaît dans le bundle
client.

## Sécurité

Détail : [docs/SECURITY.md](docs/SECURITY.md).

- CSP dérivée du projet Supabase configuré (aucun joker, plus de Sanity), HSTS
  sans preload, aucune donnée externe insérée comme HTML.
- Autorisation vérifiée côté serveur sur chaque page et action d'administration
  (jeton Supabase validé + habilitation active dans `public.editors`) et en
  base (RLS + fonctions transactionnelles).
- Publications transactionnelles : fiche + traductions + audit dans une seule
  transaction, verrou optimiste, transitions idempotentes, médias refusés en
  base s'ils ne sont pas diffusables.
- Brouillons, preuves de consentement et candidates State of BIB dans des
  buckets privés ; signature binaire des fichiers importés vérifiée.
- Formulaire public : même origine, champ piège, limiteur partagé en échec
  fermé, double opt-in tracé, réponse uniforme.
- Veille protégée contre la SSRF ; prompts IA isolant les données externes.
- Journaux structurés masquant e-mails, jetons et clés.

## Tests

Plan et couverture : [docs/TEST_PLAN.md](docs/TEST_PLAN.md).

```bash
pnpm test                                   # unitaires et sécurité (sans réseau)
python -m unittest discover -s data-pipeline/tests
PGURL=postgresql://postgres@localhost:5432/postgres pnpm test:sql   # base JETABLE uniquement
```

La CI exécute ces trois suites (la suite SQL sur un conteneur PostgreSQL
éphémère), plus lint, typage, build, audit et vérification des en-têtes servis.

## Exploitation

[docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) — newsletter, State of
BIB, médias, veille, incidents. Migration du projet Supabase existant :
[docs/SUPABASE_MIGRATION_PLAN.md](docs/SUPABASE_MIGRATION_PLAN.md).

## Limitations connues

Voir [docs/audits/BIB_REMEDIATION_REPORT.md](docs/audits/BIB_REMEDIATION_REPORT.md)
et [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md#limitations-et-risques).
