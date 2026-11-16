# BIB — architecture cible V2 (Supabase source primaire, Luma, automatisations)

Branche `feature/bib-architecture-cible-complete` · PR #32 · état au 16 novembre 2026.
Migrations 0001 à 0013 enregistrées sur `akori` ; aucun service n'a encore été
exécuté en conditions réelles (voir le README, « État des modules »).

## 1. Principes

- **Supabase `akori` = 100 % BIB.** Les objets KoriVenture hérités sont retirés
  par les scripts `supabase/ops/akori/` (jamais par `supabase db push`).
- **Luma est la source de vérité des événements.** Flux : Luma iCal → synchronisation
  → Supabase → site. Le site ne crée plus d'événement ; l'équipe n'édite que des
  compléments éditoriaux (visuel, textes BIB par langue).
- **State of BIB : Supabase est la source primaire.** Les JSON du dépôt ne sont
  plus qu'une copie technique interne, utilisée en repli seulement si elle est
  valide. Aucune fusion de PR ni approbation n'est requise pour publier.
- **Modes d'automatisation** (`automation_settings`, modifiables par un admin,
  journalisés) : `auto`, `review`, `paused` pour `sob`, `sob_insights`, `newsletter`.
- **Aucune donnée participant, paiement ou billet** n'est importée de Luma.

## 2. Événements (Luma)

| Élément | Fichier |
|---|---|
| Parseur iCal RFC 5545 (TZID, journées entières, RRULE/EXDATE/RECURRENCE-ID, SEQUENCE, déduplication par UID) | `src/lib/events/ical.ts` |
| Normalisation, empreinte de contenu, liste d'hôtes autorisés | `src/lib/events/luma-normalize.ts` |
| Orchestration (verrou atomique `begin_event_sync_run`, journal, retries, flux borné 10 Mo, contrôle de complétude, incidents) | `src/lib/events/luma-sync.ts` |
| Route planifiée | `src/app/api/cron/luma-sync/route.ts` (workflow `events-sync.yml`, toutes les 3 h) |
| RPC idempotente (service uniquement) | `public.sync_luma_events` (migration 0011) |
| Admin : journal, synchronisation manuelle, import `.ics` historique, compléments | `/admin/evenements` |
| Public : calendrier Luma embarqué (`getLumaEmbedUrl`, conservé depuis main) + vues liste/mois, filtres, historique paginé, annulations, rétrospectives | `/evenements` |

Garanties en base : UPSERT par UID, détection de changement par empreinte, jamais
de suppression (absent du flux complet → `missing_since`), flux vide refusé
(BIB08), champs Luma en lecture seule hors service (BIB07), annulations conservées
et affichées. Un import `.ics` ne marque aucun absent (flux partiel).

Récurrences : RRULE (DAILY, WEEKLY+BYDAY, MONTHLY par quantième ou nième jour,
YEARLY), RDATE, EXDATE, RECURRENCE-ID. Tout le passé d'une série est développé ;
le futur est borné à 730 jours ; un garde-fou de 5 000 occurrences par série
signale toute troncature. Une règle non prise en charge n'est jamais calculée
à tort : première occurrence seule et avertissement.

**Couverture historique :** un flux iCal peut ne pas contenir les événements
anciens. Ce qui a déjà été synchronisé reste en base ; pour le reste, importer
un export `.ics` depuis `/admin/evenements`.

**À vérifier en exploitation :** l'URL iCal et une première synchronisation
réelle (aucun appel à Luma n'a été fait pendant le développement). Sans `LUMA_ICAL_URL`, une URL
candidate est construite depuis `cal-aqEzCpUP5LXSBcL` ; elle n'a pas pu être
vérifiée depuis l'environnement de développement (réseau filtré). Le journal
`event_sync_runs` indique le résultat de la première exécution.

## 3. State of BIB

> **Fonctionnement entièrement automatique depuis la migration 0013** : modes
> `auto`, vérification horaire, contrôles renforcés à la place de la revue
> humaine, actualisation du site vérifiée. Voir `SOB_AUTOMATION.md`, qui fait
> foi pour le cycle, les paramètres et l'activation.

```
refresh-data.yml
  check   → check_version.py : manifeste officiel, version + empreinte des
            ressources utilisées (nouvelle version, CORRECTION sous le même
            numéro → version logique « <version>-rN », reprise bornée)
  build   → build_data.py : URLs lues dans le manifeste, contrôle d'intégrité
            (taille ; blake3 complet avec SOB_VERIFY_B3=true), indicateurs
            Afrique/Caraïbes, validation du lot
          → publish_supabase.py ingest
              ├─ rapport : schéma, cohérence croisée, doublons, dates,
              │            divergence (seuil 50 %), provenance
              ├─ invalide → version « blocked » + incident (rien n'est publié)
              └─ valide  → candidate « validated » (bucket privé, SHA-256,
                           observations historisées)
                   ├─ auto   → publish_dataset_candidate ; forte variation →
                   │           contrôles renforcés automatiques (reinforced.py)
                   ├─ review → /admin/state-of-bib (approuver / rejeter)
                   └─ paused → collecte uniquement
  repo-sync → publish_supabase.py reconcile (PostgreSQL / Storage / dépôt)
              ├─ alignés → rien
              ├─ dépôt en retard → export-current (SHA-256) + PR automatique
              └─ Storage ≠ PostgreSQL → échec du job + incident critique
  finalize → publish-pending, reconcile, /api/cron/sob-refresh (caches,
             version servie vérifiée, analyses IA)
```

**Source.** Le format du manifeste (`dataset.version`, `dataset.resources[]`
avec `path`, `size_bytes`, `b3sum`) a été vérifié dans le client officiel
(`github.com/electric-capital/open-dev-data`). Les chemins relatifs se
résolvent par rapport à l'URL du manifeste ; les hôtes acceptés sont
`data.opendevdata.org` et `data.developerreport.com`. Le pipeline ne construit
plus aucune URL de ressource. **Non vérifié depuis l'environnement de
développement** (réseau filtré) : le contenu réel du manifeste et le nom exact
des fichiers Parquet ; une table absente du manifeste arrête le traitement avec
un message explicite.

**Aucun export public.** La route `/api/state-of-bib/export`, les liens CSV/JSON
et leurs traductions sont supprimés (l'ancienne URL répond 404). Les JSON
internes sont dans `data/state-of-bib/` (hors de `public/`, non servis). Depuis
la migration 0012, le bucket `bib-sob-snapshots` est privé et la lecture
anonyme des tables `dataset_versions`, `dataset_artifacts`,
`metric_observations`, `data_sources` et `sob_insights` est retirée : le site
lit tout côté serveur avec la clé de service. Les chiffres affichés restent,
par nature, lisibles dans la page ; l'objectif est de supprimer les mécanismes
de téléchargement et l'accès direct aux artefacts complets.

**Sources au légal uniquement.** Fournisseurs, jeux de données, licences,
attribution, modifications, périmètre, méthodologie, limites et fréquence de
mise à jour sont présentés sur `/data-sources` (FR, EN, ES), liée depuis le
pied de page et depuis State of BIB. Aucun fournisseur ni licence n'est nommé
ailleurs sur le site public ; un test parcourt les traductions et les
composants, et les analyses IA qui en mentionnent sont refusées. La provenance
reste complète en interne (`data_sources`, `dataset_versions`, rapport de
validation, `meta.json`). Licence CC BY 4.0 : l'attribution (« Open Dev Data by
Electric Capital », lien vers la source, lien vers la licence, indication des
modifications) est fournie sur la page légale, accessible par un lien depuis
chaque page de statistiques — présentation « raisonnable selon le support » au
sens de la licence. Si le fournisseur demandait une mention plus visible, elle
devrait être rétablie sur les pages de statistiques.

**Repli et indisponibilité.** `src/lib/sob/load.ts` lit la version courante
(artefacts privés, SHA-256, recontrôle de cohérence). À défaut, la copie
technique du dépôt n'est utilisée que si elle est cohérente, de provenance
connue et vieille de moins de 120 jours (`src/lib/sob/validity.ts`). Sinon le
site affiche un état d'indisponibilité, sans aucun chiffre. **La copie d'avril
2026 est refusée** (pays 38/40, développeurs 4 283/5 306, commits
2 847 293/2 754 310, sans `pipeline_version`, périmée).

**Historique.** Toutes les versions et observations sont conservées ; la série
affichée ne contient que des observations réelles (une par version publiée).
Restauration : `/admin/state-of-bib` ou `publish_supabase.py rollback`.

**Administration** (`/admin/state-of-bib`) : versions et rapports, fraîcheur,
approbation, rejet, restauration, mode, incidents, contrôle de cohérence
base/fichiers, relance du pipeline (`GITHUB_DISPATCH_TOKEN`).

## 4. Newsletter

- Cycle (America/Toronto) : lundi brouillons IA, mardi contrôles (régénération
  bornée), mercredi 09:00 envoi — ou créneau planifié par l'équipe. Une
  édition non éligible ne part pas ; aucun rattrapage automatique.
- Modes : `auto` (envoi autonome si tout est valide), `review` (approbation
  admin postérieure à la paire validée ; toute nouvelle version l'annule),
  `paused` (ni génération IA ni envoi).
- **Envoi manuel indépendant de l'envoi automatique.**
  `FEATURE_NEWSLETTER_AUTOSEND=false` empêche tout envoi autonome ; un
  administrateur peut toujours envoyer manuellement une édition validée
  (confirmation « ENVOYER »), sous réserve du mode, des contrôles de contenu,
  de la configuration Brevo et de l'idempotence. Un refus d'envoi manuel
  n'annule jamais l'édition.
- Sources d'actualité (`/admin/newsletter/sources`) : un flux RSS/Atom n'est
  enregistré qu'après lecture réelle et contrôle ; les conditions de
  réutilisation sont obligatoires ; l'activation est faite par un
  administrateur. **Aucune source n'est pré-remplie** : la table est vide tant
  que l'équipe n'en a pas ajouté.
- Rubriques : Blockchain Insights (faits d'une version State of BIB publiée,
  par marqueurs), Blockchain News (articles collectés, source nommée et lien
  d'origine dans l'e-mail), BIB Events (événements Supabase issus de Luma, non
  annulés, encore présents dans le flux), BIB Highlights (rétrospectives publiées).
- `/admin/newsletter` : création d'un cycle, édition FR/EN (textes, éléments,
  ordre), aperçus, contrôles, approuver/rejeter/régénérer, planifier, envoyer,
  annuler, historique.
- Anti double envoi : verrou de statut `eligible → sending`, clé d'idempotence
  `semaine:langue`, réconciliation Brevo par nom de campagne, statut `unknown`
  sans renvoi automatique en cas de résultat incertain, envoi partiel signalé.

## 5. Administration

`/admin/automatisations` : modes, dernières exécutions (Luma, State of BIB,
newsletter), incidents, journal d'audit. Codes d'erreur métier BIB01–BIB09
traduits dans `src/lib/editorial/rpc.ts`.

## 6. Variables

| Variable | Où | Secret | Rôle | Valeur attendue |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Vercel | Non | URL publique du site | `https://…` |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Non | Projet Supabase BIB | URL du projet `akori` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel | Non | Clé publique (auth, lecture RLS) | clé publishable |
| `SUPABASE_SECRET_KEY` | Vercel (serveur) | **Oui** | Lecture serveur State of BIB, synchronisations, newsletter | clé de service |
| `CRON_SECRET` | Vercel (serveur) | **Oui** | Authentifie les appels `/api/cron/*` | aléatoire, ≥ 32 caractères |
| `NEXT_PUBLIC_LUMA_CALENDAR_ID` | Vercel | Non | Calendrier Luma (embed et flux) | `cal-aqEzCpUP5LXSBcL` |
| `LUMA_ICAL_URL` | Vercel (serveur) | Non | Flux iCal copié depuis Luma | URL HTTPS Luma |
| `FEATURE_LUMA_SYNC` | Vercel | Non | Active la synchronisation planifiée | `true` en service |
| `FEATURE_SOB_READ_FROM_SUPABASE` | Vercel | Non | Lecture Supabase (défaut activé) | absent, ou `false` pour diagnostic |
| `SOB_INSIGHTS_MAX_ATTEMPTS` | Vercel | Non | Tentatives d'analyse IA par version et langue | défaut 3 |
| `GITHUB_DISPATCH_TOKEN` | Vercel (serveur) | **Oui** | Relance des workflows depuis l'admin | jeton à portée « Actions: write » sur ce dépôt |
| `GITHUB_REPOSITORY_SLUG`, `GITHUB_DISPATCH_REF` | Vercel | Non | Dépôt et branche des workflows | défaut `Pheniiix-Ankh-Group-Inc/akori`, `main` |
| `FEATURE_NEWS_INGEST` | Vercel | Non | Collecte planifiée des actualités | `true` en service |
| `FEATURE_AI`, `AI_PROVIDER`, `AI_MODEL` | Vercel | Non | Moteur IA | selon le fournisseur |
| `AI_API_KEY` | Vercel (serveur) | **Oui** | Clé du fournisseur IA | — |
| `AI_MAX_CALLS_PER_RUN`, `AI_MAX_TOKENS_PER_RUN`, `NEWSLETTER_MAX_REGENERATIONS` | Vercel | Non | Budgets IA | défauts 4 / 60000 / 2 |
| `BREVO_API_KEY` | Vercel (serveur) | **Oui** | API Brevo | — |
| `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Vercel | Non | Expéditeur (domaine authentifié dans Brevo) | — |
| `BREVO_LIST_ID_FR`, `BREVO_LIST_ID_EN` | Vercel | Non | Listes par langue | identifiants numériques |
| `BREVO_DOI_TEMPLATE_ID_FR`, `BREVO_DOI_TEMPLATE_ID_EN` | Vercel | Non | Modèles de double opt-in | identifiants numériques |
| `FEATURE_NEWSLETTER_SUBSCRIBE` | Vercel | Non | Ouvre le formulaire d'inscription | `true` en service |
| `FEATURE_NEWSLETTER_AUTOSEND` | Vercel | Non | Autorise l'envoi **autonome** (l'envoi manuel n'en dépend pas) | `true` pour le mode automatique |
| `NEWSLETTER_EMAIL_HASH_PEPPER` | Vercel (serveur) | **Oui** | Empreinte des adresses (preuve de consentement) | aléatoire, ≥ 32 caractères |
| `FEATURE_OPS_ALERTS`, `OPS_ALERT_EMAIL_TO` | Vercel | Non | Alertes e-mail internes | facultatif |
| `BIB_SCHEDULES_ENABLED` | GitHub (variable) | Non | Active les exécutions planifiées (le déclenchement manuel reste possible) | `true` en service |
| `BIB_SITE_URL` | GitHub (variable) | Non | URL appelée par les workflows | URL de production |
| `BIB_CRON_SECRET` | GitHub (secret) | **Oui** | Même valeur que `CRON_SECRET` | — |
| `SOB_SUPABASE_SYNC` | GitHub (variable) | Non | Active l'ingestion et la réconciliation | `true` en service |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | GitHub (secrets) | **Oui** | Pipeline State of BIB | projet BIB uniquement |
| `SOB_CHECK_INTERVAL_HOURS`, `SOB_STRONG_VARIATION`, `SOB_MAX_BLOCKED_ATTEMPTS`, `SOB_BLOCKED_RETRY_HOURS`, `SOB_VERIFY_B3`, `SOB_STALE_DAYS`, `SOB_MAX_FAILED_ATTEMPTS` | GitHub (variables) | Non | Cadence, seuils et reprises du pipeline automatique (`SOB_AUTOMATION.md`) | facultatif |

`SOB_E2E_FIXTURE_DIR` ne sert qu'aux tests de bout en bout ; il ne doit jamais
être défini en production.

## 7. Migration 0012

Fichier : `supabase/migrations/20261116001200_bib_finalisation.sql` (additive,
rejouable, aucune donnée supprimée). Application sur `akori` :
`supabase/ops/akori/05_apply_0012.sql` dans l'éditeur SQL (transaction unique,
contrôles préalables et finaux), ou `supabase db push`. Répétée sur une base
jetable : 28 tables, buckets privés, lecture anonyme retirée, rejeu refusé.

**État :** 0012 est enregistrée sur `akori` (vérifié le 16 novembre 2026).

**Ordre de déploiement (autre projet) :** appliquer 0012 **avant** de déployer ce code. Sans
0012, la synchronisation Luma retombe sur l'ancien verrou (avertissement dans le
journal), le contrôle de cohérence ne peut pas être journalisé et les articles
classés « paiements », « infrastructure » ou « communauté » ne sont pas enregistrés.

Retour arrière (si nécessaire) : rétablir la lecture publique avec les
politiques d'origine de la migration 0004, `update storage.buckets set public =
true where id = 'bib-sob-snapshots'`, `drop function
public.begin_event_sync_run`, `drop index event_sync_runs_single_running_idx`.
Les colonnes et valeurs d'énumération ajoutées peuvent rester.

## 8. Mise en service (ordre)

1. Migrations 0012 et 0013 : déjà enregistrées sur `akori`. Lancer les conseillers Supabase.
2. Créer le premier administrateur BIB (procédure d'amorçage, `docs/DEPLOYMENT.md`).
3. Luma : renseigner `LUMA_ICAL_URL`, lancer « Synchroniser maintenant » dans
   `/admin/evenements`, vérifier le journal ; importer un export `.ics` si
   l'historique du flux est incomplet ; activer `FEATURE_LUMA_SYNC`.
4. State of BIB : `SOB_SUPABASE_SYNC=true`, lancer `refresh-data.yml` avec
   `force_build`. La version valide est publiée sans approbation ; contrôler le
   rapport dans `/admin/state-of-bib` (`SOB_AUTOMATION.md`).
5. Newsletter : ajouter et activer les sources dans
   `/admin/newsletter/sources`, configurer Brevo (domaine authentifié, listes,
   modèles de double opt-in), relire Confidentialité et Cookies, puis ouvrir
   `FEATURE_NEWSLETTER_SUBSCRIBE`.
6. Choisir les modes dans `/admin/automatisations`, puis `BIB_SCHEDULES_ENABLED=true`.

Pages incomplètes : `docs/PAGES_IN_PROGRESS_AUDIT.md`.

## 9. Tests

```bash
pnpm lint && pnpm typecheck && pnpm test          # unitaires (Vitest)
python -m unittest discover -s data-pipeline/tests  # pipeline (sans réseau)
PGURL=postgresql://… bash supabase/tests/run.sh     # SQL et RLS, base jetable

# Bout en bout (site démarré). Les visualisations exigent des données valides :
# une fixture cohérente de TEST est générée puis lue par le serveur.
node tests/helpers/sob-fixture.mjs /tmp/sob-fixture
rm -rf .next && SOB_E2E_FIXTURE_DIR=/tmp/sob-fixture pnpm build
SOB_E2E_FIXTURE_DIR=/tmp/sob-fixture pnpm start &
BASE_URL=http://localhost:3000 pnpm test:e2e                       # navigateur
BASE_URL=http://localhost:3000 SOB_EXPECT=available pnpm test:e2e:rules

# Sans fixture ni Supabase : état d'indisponibilité attendu.
rm -rf .next && pnpm build && pnpm start &
BASE_URL=http://localhost:3000 SOB_EXPECT=unavailable pnpm test:e2e:rules
```

Aucun test n'appelle Luma, Brevo, le fournisseur de données ni un fournisseur
d'IA : flux `.ics`, API et manifestes sont simulés.
