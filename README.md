# Black in Blockchain (BIB)

Site public multilingue, administration privée et traitements de données de
**Black in Blockchain**, une communauté consacrée à la blockchain.

> Ce README décrit le code de ce dépôt. Il ne définit ni la mission ni le
> positionnement éditorial de BIB : les textes publics sont ceux validés par
> l'équipe.

- [Présentation](#présentation)
- [État des modules](#état-des-modules)
- [Architecture technique](#architecture-technique)
- [Fonctionnalités](#fonctionnalités)
- [Flux de données](#flux-de-données)
- [Structure du dépôt](#structure-du-dépôt)
- [Développement local](#développement-local)
- [Variables d'environnement](#variables-denvironnement)
- [Supabase](#supabase)
- [Automatisation](#automatisation)
- [Déploiement](#déploiement)
- [Sécurité](#sécurité)
- [Documentation complémentaire](#documentation-complémentaire)

## Présentation

La plateforme réunit :

- un **site public** en anglais (langue par défaut, sans préfixe), français et
  espagnol ;
- les **événements** de la communauté, synchronisés depuis Luma ;
- **BIB en action** : rétrospectives, médias et témoignages ;
- **State of BIB** : un observatoire de l'activité des développeurs open source
  en Afrique et dans les Caraïbes ;
- une **newsletter** FR/EN diffusée par Brevo ;
- une **administration** réservée à l'équipe (`/admin`, sur invitation).

Périmètre du dépôt (`akori`) : l'application Next.js, les migrations et tests
Supabase, le pipeline de données Python et les workflows GitHub Actions. Le
dépôt ne contient aucun secret et ne crée aucune ressource cloud par lui-même.

## État des modules

« Implémenté » ne veut pas dire « déployé », et « déployé » ne veut pas dire
« validé en production ». Le tableau distingue cinq niveaux. État constaté le
16 novembre 2026.

| Module | Implémenté | Testé localement | Services externes configurés | Validé en environnement réel | Opérationnel en production |
| --- | --- | --- | --- | --- | --- |
| Site public FR/EN/ES | Oui | Oui | Sans objet | Non (cette version n'est pas déployée) | Non |
| Événements (Luma → Supabase) | Oui | Oui (flux simulés) | Schéma appliqué ; `LUMA_ICAL_URL` non vérifiée | Non (aucune synchronisation réelle) | Non |
| BIB en action | Oui | Oui | Schéma et buckets appliqués | Non | Non |
| State of BIB (pipeline et publication automatique) | Oui | Oui (source simulée) | Schéma appliqué, modes `auto` ; variables GitHub et Vercel non vérifiées | Non (aucune exécution du pipeline) | Non (aucune version publiée) |
| Analyses IA State of BIB | Oui | Oui (fournisseur simulé) | Non vérifié | Non | Non |
| Newsletter (inscription, cycle, envoi) | Oui | Oui (Brevo simulé) | Schéma appliqué ; Brevo et sources d'actualité non vérifiés | Non (aucun envoi réel) | Non |
| Administration | Oui | Oui | Schéma appliqué ; **aucun administrateur créé** | Non | Non |
| Workflows planifiés | Oui | Oui (hors exécution réelle) | Non vérifié | Non | Non |

Constats vérifiés sur le projet Supabase `akori` : 13 migrations enregistrées
(0001 à 0013), modes `sob = auto`, `sob_insights = auto`, `newsletter = review`,
aucun administrateur, aucune version State of BIB, aucune exécution du pipeline,
aucune synchronisation Luma. « Non vérifié » signifie que l'état n'a pas pu être
lu depuis l'environnement de développement (variables GitHub, Vercel, Brevo).

Tant qu'aucune version State of BIB valide n'est publiée, la page affiche un
**état d'indisponibilité**, sans aucun chiffre.

## Architecture technique

| Couche | Technologie (version du dépôt) |
| --- | --- |
| Application | Next.js 16.4 (App Router), React 19.2, TypeScript 5 (strict) |
| Interface | Tailwind CSS 4 et feuilles du projet (`globals.css`, `state-of-bib.css`, `admin.css`) |
| Internationalisation | next-intl 4 — `en` (défaut, sans préfixe), `fr`, `es` |
| Base de données | Supabase PostgreSQL (RLS sur toutes les tables, fonctions transactionnelles) |
| Authentification | Supabase Auth — opérateurs invités uniquement, inscription publique fermée |
| Fichiers | Supabase Storage (médias, preuves de consentement, lots State of BIB) |
| Événements | Luma — calendrier embarqué et flux iCal |
| Newsletter | Brevo (API serveur, double opt-in) |
| Données | Python 3.12, DuckDB, pandas (`data-pipeline/`) |
| IA | Moteur à fournisseur configurable (`anthropic`, `openai`, `mistral`, `openai-compatible`, `mock`) |
| Visualisations | D3, TopoJSON, world-atlas |
| Planification et CI | GitHub Actions |
| Hébergement | Vercel |

Gestionnaire de paquets : **pnpm 10** (`pnpm-lock.yaml`). Node ≥ 20.9.

## Fonctionnalités

### Site public

Accueil, À propos (`/fondateurs`), Événements, BIB en action, State of BIB,
pages légales (`/terms`, `/privacy`, `/cookies`, `/data-sources`). Six pages
(`/about`, `/mission`, `/membership`, `/resources`, `/press`, `/contact`)
affichent encore un gabarit « page en préparation », exclu de l'indexation :
voir [docs/PAGES_IN_PROGRESS_AUDIT.md](docs/PAGES_IN_PROGRESS_AUDIT.md).

### Événements, calendrier et historique

- **Luma est la source de vérité.** L'équipe ne crée pas d'événement dans
  l'administration ; elle n'ajoute que des compléments éditoriaux (visuel,
  textes BIB par langue).
- La page `/evenements` affiche le calendrier Luma embarqué, puis les
  événements synchronisés : vues liste et mois, filtres, historique paginé,
  annulations signalées, lien vers la rétrospective.
- La synchronisation lit le flux iCal (RFC 5545 : fuseaux, journées entières,
  `RRULE`, `RDATE`, `EXDATE`, `RECURRENCE-ID`) et l'enregistre dans Supabase.
  Un événement n'est **jamais supprimé** : absent du flux, il est marqué comme
  tel ; annulé, il reste affiché comme annulé.
- Un flux iCal peut ne pas contenir les événements anciens : un fichier `.ics`
  peut être importé depuis `/admin/evenements`.
- Aucune donnée de participant, de billet ou de paiement n'est importée.

### BIB en action

Rétrospectives, galerie, vidéo et témoignages avec référence de consentement.
Un fichier reste privé tant qu'un contenu publié ne l'utilise pas **et** que
ses droits ne sont pas approuvés ; le retrait supprime la copie publique.

### State of BIB

- Carte, courbes, classement et cohortes interactifs, filtres partagés dans
  l'URL, en FR/EN/ES.
- Périmètre : Afrique et Caraïbes (76 pays et territoires). Les chiffres ne
  mesurent pas la diaspora.
- **Aucun téléchargement public** : pas d'export CSV/JSON, pas d'URL
  d'artefact. Les fournisseurs, licences et la méthodologie figurent
  uniquement sur la page légale `/data-sources`.
- Publication **entièrement automatique**, sans approbation humaine (voir
  [Automatisation](#automatisation)).
- **Données publiées et copie de repli.** La source affichée est la version
  courante publiée dans Supabase. Le dossier `data/state-of-bib/current/` est
  une copie technique interne, non servie par le site ; elle ne sert de repli
  que si elle est cohérente, de provenance connue et âgée de moins de
  120 jours. La copie actuellement présente date d'avril 2026, est incohérente
  et antérieure au pipeline actuel : **elle est refusée** et ne doit pas être
  lue comme une statistique à jour.

### Analyses IA

Courtes analyses FR/EN/ES d'une version publiée de State of BIB. Les chiffres
sont insérés par marqueurs depuis les données (jamais rédigés par l'IA) ; des
contrôles hors IA vérifient la tendance, le périmètre et l'absence de mention
de fournisseur. Une analyse n'est jamais affichée pour une autre version que
la sienne. En cas d'échec, les statistiques restent publiées sans analyse.

### Newsletter

| Étape | Comportement |
| --- | --- |
| Inscription | Formulaire FR ou EN, consentement explicite, double opt-in Brevo |
| Sources d'actualité | Flux RSS/Atom ajoutés par l'équipe dans `/admin/newsletter/sources`, après lecture réelle et saisie des conditions de réutilisation. **Aucune source n'est préconfigurée.** |
| Rédaction automatique | Lundi : brouillons FR et EN par l'IA, quatre rubriques (Blockchain Insights, Blockchain News, BIB Events, BIB Highlights). Mardi : contrôles hors IA, régénération bornée |
| Relecture humaine (facultative) | L'équipe peut modifier textes, éléments et ordre dans `/admin/newsletter/[id]` ; toute modification repasse les contrôles |
| Envoi autonome | Mercredi 09:00 (America/Toronto), seulement si `FEATURE_NEWSLETTER_AUTOSEND=true` et que le mode le permet. Sans rattrapage |
| Envoi manuel | Un administrateur peut envoyer une édition validée (confirmation « ENVOYER »), **indépendamment** de `FEATURE_NEWSLETTER_AUTOSEND` |

Modes (`/admin/automatisations`) : `auto` (envoi autonome si tout est valide),
`review` (approbation d'un administrateur requise — mode actuel), `paused`
(ni génération ni envoi).

### Administration

`/admin` : événements (journal de synchronisation, compléments, import
`.ics`), BIB en action, médias et droits, témoignages, State of BIB
(supervision, incidents, restauration), newsletter, automatisations (modes,
dernières exécutions, incidents, journal d'audit).

### Observabilité

Journaux structurés masquant e-mails, jetons et clés ; table `ops_incidents` ;
journaux d'exécution (`event_sync_runs`, `ingestion_runs`) ; journal d'audit
(`editorial_audit`) ; alertes e-mail internes facultatives
(`FEATURE_OPS_ALERTS`).

## Flux de données

```text
Événements
  Luma (flux iCal) ── GitHub Actions (events-sync, toutes les 3 h)
                      └─ POST /api/cron/luma-sync ── Supabase ── site BIB
  Luma (calendrier embarqué) ─────────────────────────────────── site BIB

State of BIB
  Electric Capital (manifeste Open Dev Data)
    └─ GitHub Actions (refresh-data, toutes les heures)
         ├─ check     lecture légère du manifeste
         ├─ build     Python / DuckDB → six fichiers JSON → validation
         │            → Supabase (PostgreSQL + Storage privé) → publication
         └─ finalize  réconciliation → POST /api/cron/sob-refresh
                      (caches, version servie, analyses IA)
  Supabase ── lecture côté serveur ── page State of BIB

Newsletter
  Sources d'actualité autorisées ── veille (news-ingest, quotidienne)
    └─ Supabase ── moteur IA ── éditions FR/EN ── contrôles hors IA
         └─ relecture facultative ── Brevo ── abonnés
```

## Structure du dépôt

| Chemin | Rôle |
| --- | --- |
| `src/app/[locale]/(public)` | Pages publiques localisées |
| `src/app/(operateurs)` | Connexion et administration |
| `src/app/api` | Inscription newsletter, routes planifiées (`/api/cron/*`), diagnostics (`/api/ops/*`) |
| `src/components` | Composants d'interface (site, State of BIB, administration) |
| `src/lib` | Logique métier : `events`, `sob`, `newsletter`, `news`, `ai`, `auth`, `supabase`, `ops` |
| `src/messages` | Traductions `en`, `fr`, `es` |
| `data-pipeline` | Pipeline State of BIB (Python, DuckDB) et ses tests |
| `data/state-of-bib` | Copie technique interne des lots (non servie) et historique |
| `supabase/migrations` | Migrations versionnées |
| `supabase/tests` | Tests SQL et RLS (base jetable uniquement) |
| `supabase/ops`, `supabase/bootstrap` | Scripts d'exploitation et création du premier administrateur |
| `tests` | Tests unitaires (Vitest) et navigateur (Playwright) |
| `.github/workflows` | CI et tâches planifiées |
| `docs` | Guides spécialisés |

## Développement local

Prérequis : Node ≥ 20.9, pnpm 10 ; Python 3.12 pour le pipeline ; PostgreSQL
pour les tests SQL (facultatif).

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # valeurs factices
pnpm dev                     # http://localhost:3000
```

Sans Supabase configuré, le site démarre : Événements et BIB en action
affichent un état vide, State of BIB un état d'indisponibilité, et
l'administration est inaccessible.

```bash
pnpm lint
pnpm typecheck
pnpm test          # tests unitaires et de sécurité (Vitest, sans réseau)
pnpm build
pnpm check         # lint + typecheck + test + build

# Pipeline de données
pip install -r data-pipeline/requirements.txt
python -m unittest discover -s data-pipeline/tests

# SQL et RLS — base JETABLE uniquement (le script refuse une URL Supabase)
PGURL=postgresql://postgres@localhost:5432/postgres pnpm test:sql

# Navigateur (site démarré)
BASE_URL=http://localhost:3000 pnpm test:e2e
BASE_URL=http://localhost:3000 SOB_EXPECT=unavailable pnpm test:e2e:rules
```

Aucun test n'appelle Luma, Brevo, le fournisseur de données ou un fournisseur
d'IA. Détail et jeux d'essai : [docs/TEST_PLAN.md](docs/TEST_PLAN.md).

## Variables d'environnement

Liste complète et commentée : [.env.example](.env.example). Matrice détaillée :
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#13-matrice-des-variables). Ne jamais
committer une valeur réelle.

### Application (Vercel)

| Nom | Fonction | Obligatoire | Défaut | Secret |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL canonique | Oui en production | `http://localhost:3000` | Non |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Projet Supabase BIB | Pour les données et l'administration | Aucun accès Supabase | Non |
| `SUPABASE_SECRET_KEY` | Lectures et écritures serveur | Pour State of BIB, synchronisations, newsletter | Fonctions serveur désactivées | **Oui** |
| `CRON_SECRET` | Authentifie `/api/cron/*` (≥ 32 caractères) | Pour les tâches planifiées | Appels refusés | **Oui** |
| `NEXT_PUBLIC_LUMA_CALENDAR_ID` | Calendrier Luma (embarqué et flux) | Non | `cal-aqEzCpUP5LXSBcL` | Non |
| `LUMA_ICAL_URL` | Flux iCal copié depuis Luma | Recommandé | URL candidate non vérifiée | Non |
| `FEATURE_LUMA_SYNC` | Synchronisation planifiée | Non | `false` | Non |
| `FEATURE_SOB_READ_FROM_SUPABASE` | Lecture State of BIB dans Supabase | Non | `true` | Non |
| `SOB_INSIGHTS_MAX_ATTEMPTS` | Tentatives d'analyse par version et langue | Non | `3` | Non |
| `FEATURE_AI`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL` | Moteur IA | Si l'IA est activée | IA désactivée | Non |
| `AI_API_KEY` | Clé du fournisseur IA | Si l'IA est activée | — | **Oui** |
| `BREVO_API_KEY` | API Brevo | Pour la newsletter | Inscription et envoi fermés | **Oui** |
| `BREVO_LIST_ID_FR/EN`, `BREVO_DOI_TEMPLATE_ID_FR/EN`, `BREVO_SENDER_EMAIL/NAME` | Listes, modèles, expéditeur | Pour la newsletter | — | Non |
| `NEWSLETTER_EMAIL_HASH_PEPPER` | Empreintes e-mail et IP (≥ 32 caractères) | Pour l'inscription | Inscription fermée (503) | **Oui** |
| `FEATURE_NEWSLETTER_SUBSCRIBE`, `FEATURE_NEWSLETTER_AUTOSEND`, `FEATURE_NEWS_INGEST`, `FEATURE_OPS_ALERTS` | Activations | Non | `false` | Non |
| `GITHUB_DISPATCH_TOKEN` | Relance des workflows depuis l'administration | Non | Relance indisponible | **Oui** |

### Workflows (GitHub Actions)

| Nom | Type | Fonction | Obligatoire | Défaut |
| --- | --- | --- | --- | --- |
| `BIB_SCHEDULES_ENABLED` | Variable | `true` active les exécutions planifiées | Non | Désactivées (déclenchement manuel possible) |
| `BIB_SITE_URL` | Variable | URL du site appelé par les workflows | Oui | — |
| `BIB_CRON_SECRET` | Secret | Même valeur que `CRON_SECRET` | Oui | — |
| `SOB_SUPABASE_SYNC` | Variable | `true` autorise le pipeline à écrire | Oui pour State of BIB | Échec explicite |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Secrets | Projet BIB (pipeline) | Oui pour State of BIB | Échec explicite |
| `SOB_CHECK_INTERVAL_HOURS`, `SOB_STRONG_VARIATION`, `SOB_MAX_FAILED_ATTEMPTS`, `SOB_MAX_BLOCKED_ATTEMPTS`, `SOB_BLOCKED_RETRY_HOURS`, `SOB_VERIFY_B3` | Variables | Cadence, seuils et reprises | Non | Voir [docs/SOB_AUTOMATION.md](docs/SOB_AUTOMATION.md) |

Les clés secrètes restent côté serveur ; la CI vérifie qu'aucune n'apparaît
dans le bundle client.

## Supabase

Projet : **`akori`**, dédié à BIB. Les objets hérités d'un autre produit ont
été retirés ; aucun autre projet Supabase ne doit être utilisé.

### Migrations

Treize migrations, à appliquer dans l'ordre. Toutes sont enregistrées sur
`akori` (vérifié le 16 novembre 2026). Une migration appliquée n'est jamais
modifiée ni rejouée.

| N° | Nom | Objet |
| --- | --- | --- |
| 0001 | `core_admin` | Habilitations (`editors`), audit, fonctions d'autorisation |
| 0002 | `events` | Événements et traductions |
| 0003 | `bib_en_action` | Rétrospectives, médias, témoignages, buckets |
| 0004 | `state_of_bib` | Sources, versions, artefacts, observations, analyses |
| 0005 | `newsletter_ai` | Veille, cycles, éditions, IA, incidents |
| 0006 | `editorial_integrity` | Publications transactionnelles, verrou optimiste |
| 0007 | `sob_governance` | Candidates privées, vérification des empreintes |
| 0008 | `newsletter_integrity` | Paire FR/EN atomique, éditions validées immuables |
| 0009 | `security_hardening` | Vues en `SECURITY INVOKER`, droits par colonne, index |
| 0010 | `legacy_koriventure_cleanup` | Retrait des objets hérités — script hors `db push` (`supabase/ops/akori/sql/`) |
| 0011 | `bib_v2_automation` | Modes d'automatisation, synchronisation Luma, publication par RPC |
| 0012 | `bib_finalisation` | Buckets privés, fin de la lecture anonyme, verrou Luma |
| 0013 | `sob_full_auto` | Modes `auto`, verrou de publication, quarantaine, vérification |

### Sécurité des données

- **RLS** activée sur toutes les tables. Le public ne lit que les contenus
  publiés ; les données State of BIB ne sont lues que côté serveur.
- **Buckets** : `bib-media-public` (public, médias publiés aux droits
  approuvés) ; `bib-media-drafts`, `bib-consents`, `bib-sob-snapshots`,
  `bib-sob-candidates` (privés).
- **RPC principales** (`SECURITY DEFINER`, `search_path` vide) :
  `sync_luma_events`, `begin_event_sync_run`, `publish_dataset_candidate`,
  `verify_current_dataset`. Les erreurs métier portent les codes BIB01 à BIB09.

### Premier administrateur

Aucun compte n'obtient de rôle automatiquement. Procédure :
[supabase/bootstrap/first_editor.sql](supabase/bootstrap/first_editor.sql) et
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#5-premier-opérateur).

### Validation

`pnpm test:sql` applique les migrations sur une base jetable et exécute les
tests SQL, RLS et de concurrence. Plan de migration et historique :
[docs/SUPABASE_MIGRATION_PLAN.md](docs/SUPABASE_MIGRATION_PLAN.md).

## Automatisation

Les exécutions planifiées ne démarrent que si `BIB_SCHEDULES_ENABLED=true` ;
chaque workflow reste déclenchable manuellement.

| Workflow | Fréquence (UTC) | Rôle |
| --- | --- | --- |
| `events-sync.yml` | Toutes les 3 h | Synchronisation Luma → Supabase (`FEATURE_LUMA_SYNC`) |
| `refresh-data.yml` | Toutes les heures | Pipeline State of BIB |
| `news-ingest.yml` | Chaque jour, 10:41 | Veille des sources autorisées (`FEATURE_NEWS_INGEST`) |
| `newsletter.yml` | Lundi, mardi, mercredi | Cycle newsletter |
| `ci.yml` | Push et pull request | Contrôles et tests |

### State of BIB

1. **Détection** — lecture légère du manifeste chaque heure. Rien n'est
   téléchargé si la version et l'empreinte des ressources n'ont pas changé.
2. **Construction et contrôles** — calcul des indicateurs, puis validation :
   format, valeurs, dates, périmètre, doublons, totaux, cohérence entre
   fichiers, provenance.
3. **Forte variation** (plus de 50 % par défaut) — sept contrôles renforcés
   automatiques au lieu d'une revue humaine.
4. **Publication** (mode `auto`) — bascule transactionnelle de la version
   courante, protégée contre les exécutions simultanées ; une version plus
   ancienne que la version en ligne est refusée. L'historique est conservé.
5. **Vérification après publication** — intégrité des fichiers publiés ; en
   cas d'écart, retour automatique à la version précédente et incident.
6. **Quarantaine et reprises** — un lot non confirmé est mis en quarantaine ;
   la dernière version valide reste en ligne. Nouvelle tentative toutes les
   24 h, cinq fois au plus, ou dès que la source ou le pipeline change.
7. **Actualisation du site** — caches invalidés, version servie vérifiée,
   analyses IA générées. Aucun redéploiement n'est nécessaire.

Les modes `review` et `paused` restent disponibles pour suspendre le cycle.
Guide complet et activation : [docs/SOB_AUTOMATION.md](docs/SOB_AUTOMATION.md).

### Luma

Verrou atomique en base (une synchronisation à la fois), reprise des
exécutions interrompues, flux vide refusé, protection contre une chute
anormale du nombre d'événements, journal dans `/admin/evenements`.

### Newsletter

Lundi : génération. Mardi : contrôles. Mercredi 09:00 (America/Toronto) :
envoi. Une édition non valide ne part pas, dans aucune des deux langues ; il
n'y a pas de rattrapage automatique. Les tâches planifiées GitHub peuvent
démarrer en retard : un retard de plus d'une heure le mercredi annule l'envoi
autonome.

## Déploiement

| Élément | Rôle |
| --- | --- |
| `develop` | Branche d'intégration. Les branches de fonctionnalité y sont fusionnées par pull request |
| `main` | Branche de production, protégée. Reçoit `develop` par pull request |
| Pull requests | CI obligatoire (`web`, `data`, `sql`) ; fusion par squash ou rebase |
| Vercel Preview | Un déploiement de prévisualisation par branche poussée |
| Vercel Production | Déploiement de `main` |
| Migrations | Appliquées séparément et volontairement, avant le code qui en dépend ; jamais par la CI |

Avant une fusion : `pnpm check`, tests Python, tests SQL sur base jetable,
tests navigateur. L'activation d'un service (drapeaux `FEATURE_*`,
planification) est une étape distincte du déploiement du code. Guide :
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Sécurité

- CSP dérivée du projet Supabase configuré, sans joker ; HSTS ; aucune donnée
  externe insérée comme HTML.
- Autorisation vérifiée côté serveur sur chaque page et action
  d'administration, et en base (RLS, fonctions transactionnelles).
- Formulaire public : même origine, champ piège, limiteur de débit en échec
  fermé, double opt-in tracé, réponse uniforme.
- Veille protégée contre la SSRF ; données externes isolées dans les prompts IA.

Détail : [docs/SECURITY.md](docs/SECURITY.md).

## Documentation complémentaire

| Document | Contenu |
| --- | --- |
| [docs/V2_ARCHITECTURE_CIBLE.md](docs/V2_ARCHITECTURE_CIBLE.md) | Architecture cible : Luma, State of BIB, newsletter, administration |
| [docs/SOB_AUTOMATION.md](docs/SOB_AUTOMATION.md) | Cycle automatique State of BIB, paramètres, activation |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Déploiement, activation, matrice des variables |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Suites de tests et couverture des risques |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Composants et modèle de données |
| [docs/SECURITY.md](docs/SECURITY.md) | Mesures de sécurité |
| [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) | Exploitation et incidents |
| [docs/EDITORIAL_WORKFLOWS.md](docs/EDITORIAL_WORKFLOWS.md) | Procédures de l'équipe éditoriale |
| [docs/SUPABASE_MIGRATION_PLAN.md](docs/SUPABASE_MIGRATION_PLAN.md) | Migration du projet `akori` |
| [docs/PAGES_IN_PROGRESS_AUDIT.md](docs/PAGES_IN_PROGRESS_AUDIT.md) | Pages encore en préparation |
| [CHANGELOG.md](CHANGELOG.md) | Historique des changements |

## Licence

Voir [LICENSE](LICENSE).
