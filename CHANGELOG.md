# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Architecture cible de la plateforme Black in Blockchain. Ces changements sont
livrés dans le code et testés localement et en CI ; ils ne sont **ni déployés
ni validés en production**. Les services externes restent désactivés tant que
leurs drapeaux et leur configuration ne sont pas en place (voir le README,
« État des modules »).

### Added

- **Événements — Luma.** Synchronisation du flux iCal de Luma vers Supabase :
  parseur RFC 5545 (fuseaux, journées entières, `RRULE`, `RDATE`, `EXDATE`,
  `RECURRENCE-ID`), enregistrement idempotent par identifiant d'événement,
  verrou atomique en base, reprise des exécutions interrompues, refus d'un
  flux vide et protection contre une chute anormale du nombre d'événements.
  Les annulations sont conservées et affichées ; un événement absent du flux
  est marqué, jamais supprimé. Import d'un fichier `.ics` pour l'historique.
- **Événements — site.** Pages `/evenements` et `/evenements/[slug]` :
  calendrier Luma embarqué, vues liste et mois, filtres, historique paginé,
  lien vers la rétrospective.
- **BIB en action.** Rétrospectives, galerie, vidéo et témoignages avec
  référence de consentement (`/en-action`, `/en-action/[slug]`) ; médias
  privés jusqu'à la publication et l'approbation des droits.
- **State of BIB — observatoire.** Filtres partagés dans une URL (région,
  métrique, pays, comparaison, écosystème, période), carte avec zoom et
  comparaison, courbes temporelles avec curseur, classement triable, cohortes
  en effectifs ou en parts ; clavier, tactile, mouvement réduit, FR/EN/ES.
- **State of BIB — pipeline.** Lecture du manifeste de la source, détection
  d'une nouvelle version ou d'une correction publiée sous le même numéro,
  calcul Python/DuckDB avec recalcul indépendant des totaux, validation du lot
  (format, périmètre, doublons, cohérence entre fichiers, provenance),
  historisation des versions et des observations dans Supabase.
- **State of BIB — publication automatique.** Publication sans approbation
  humaine en mode `auto` : contrôles renforcés automatiques en cas de forte
  variation, bascule transactionnelle protégée contre les exécutions
  simultanées, vérification après publication avec retour automatique à la
  version précédente, quarantaine et reprise bornée, réconciliation entre
  PostgreSQL, Storage et la copie du dépôt, incidents journalisés.
- **State of BIB — site.** Lecture côté serveur de la version courante avec
  contrôle d'intégrité, état d'indisponibilité quand aucune version valide
  n'existe, actualisation des caches après publication
  (`/api/cron/sob-refresh`), page légale `/data-sources` (sources, licences,
  méthodologie, FR/EN/ES).
- **Analyses IA.** Moteur commun à fournisseur configurable (`anthropic`,
  `openai`, `mistral`, `openai-compatible`, `mock`) avec budgets d'appels et
  de jetons ; analyses State of BIB par version et par langue, chiffres
  insérés par marqueurs, contrôles hors IA de tendance et de périmètre,
  tentatives bornées ; diagnostic `/api/ops/ai-status`.
- **Newsletter.** Inscription FR/EN en double opt-in Brevo avec preuve de
  consentement ; veille de sources RSS/Atom ajoutées et activées par l'équipe ;
  rédaction automatique FR/EN en quatre rubriques ; contrôles hors IA ;
  édition humaine facultative ; envoi autonome ou manuel ; protections contre
  le double envoi (verrou de statut, clé d'idempotence, réconciliation Brevo).
- **Modes d'automatisation** `auto`, `review` et `paused` pour State of BIB,
  ses analyses et la newsletter, modifiables par un administrateur et
  journalisés.
- **Administration** `/admin`, sur invitation : événements, BIB en action,
  médias et droits, témoignages, State of BIB, newsletter et sources
  d'actualité, automatisations, incidents et journal d'audit ; connexion des
  opérateurs par Supabase Auth, sans inscription publique.
- **Supabase.** Treize migrations versionnées (0001 à 0013) : habilitations,
  audit, événements, médias, State of BIB, newsletter, incidents ; RLS sur
  toutes les tables ; fonctions transactionnelles (`sync_luma_events`,
  `begin_event_sync_run`, `publish_dataset_candidate`,
  `verify_current_dataset`) ; buckets Storage ; scripts d'exploitation et
  procédure de création du premier administrateur.
- **Automatisation.** Workflows `events-sync.yml` (toutes les 3 h),
  `news-ingest.yml` (quotidien) et `newsletter.yml` (lundi, mardi, mercredi),
  inactifs tant que `BIB_SCHEDULES_ENABLED` n'est pas `true` et déclenchables
  manuellement ; relance des workflows depuis l'administration.
- **Observabilité.** Journaux structurés masquant e-mails, jetons et clés,
  table d'incidents, journaux d'exécution, alertes e-mail internes
  facultatives.
- **Tests et CI.** Tests unitaires et de sécurité (Vitest), tests du pipeline
  (unittest), tests SQL, RLS et de concurrence sur base jetable, tests
  navigateur (Playwright) ; workflow `ci.yml` (jobs `web`, `data`, `sql`) avec
  audit des dépendances, contrôle des en-têtes servis et de l'absence de clé
  serveur dans le bundle client.
- **Documentation.** Guides d'architecture, de modèle de données, de
  déploiement, d'automatisation State of BIB, de sécurité, de tests,
  d'exploitation et de procédures éditoriales ; inventaire des pages en
  préparation ; `.env.example` commenté.

### Changed

- **Charte et navigation.** Nouvelle charte claire (ivoire, encre, or ;
  Fraunces et Inter), en-tête avec menu mobile accessible, sélecteur de langue
  qui conserve la page, cibles tactiles de 44 px, contraste AA ; accueil,
  À propos, Événements, BIB en action et State of BIB redessinés ; pied de
  page limité aux pages existantes.
- **Événements.** Luma devient la source de vérité : la création manuelle
  d'événements est retirée de l'administration, qui ne gère plus que des
  compléments éditoriaux.
- **State of BIB.** Supabase devient la source des données affichées ; les
  fichiers JSON du dépôt ne sont plus qu'une copie technique interne
  (`data/state-of-bib/`), utilisée en repli seulement si elle est valide et
  récente. Le calcul attribue un seul pays à chaque développeur et dérive les
  totaux de la table par pays.
- **Pipeline de données.** `refresh-data.yml` passe d'une reconstruction
  hebdomadaire poussée sur `main` à une vérification horaire qui ne
  reconstruit qu'en cas de changement et ne pousse jamais sur `main`. Une
  configuration incomplète fait échouer le workflow au lieu de réussir sans
  rien écrire.
- **Pages en préparation.** `/about`, `/mission`, `/membership`, `/resources`,
  `/press` et `/contact` affichent un gabarit commun et sont exclues de
  l'indexation.
- `/register` indique que l'inscription est fermée ; `/dashboard` redirige
  vers `/admin`.
- **Dépendances.** Next.js 16.4, next-intl 4.15, zod 4.6, supabase-js 2.119.

### Removed

- Sanity (Studio, schémas, client), better-auth, Stripe, `pg`,
  `styled-components` et l'espace membres ; `package-lock.json` (pnpm seul).
- Fichiers JSON State of BIB servis depuis `public/data/` et tout
  téléchargement public des données.
- Mentions des fournisseurs de données et des licences en dehors de la page
  légale `/data-sources`.
- Sections décoratives de l'ancien thème sombre de l'accueil et contenus
  factuels non sourcés.
- Objets de base de données hérités d'un autre produit dans le projet
  Supabase `akori`.

### Fixed

- `/login`, `/register` et `/dashboard` n'étaient plus atteignables (404).
- Jour d'envoi de la newsletter : mercredi 9 h, heure de Toronto, été comme
  hiver.
- Publications éditoriales partielles : fiche, traductions et audit sont
  écrits dans une seule transaction, avec verrou optimiste.
- Erreurs ESLint et imports inutilisés des composants State of BIB.

### Security

- Suppression de la route publique `/api/emails/welcome`, qui permettait un
  envoi d'e-mail arbitraire ; fin de la journalisation du préfixe de la clé
  Brevo.
- En-têtes : CSP dérivée du projet Supabase configuré, sans joker ;
  `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors` ; HSTS ;
  `Referrer-Policy` et `Cross-Origin-Opener-Policy`.
- Plus d'insertion HTML de données dans la carte et les cohortes State of BIB.
- Formulaire d'inscription : même origine, champ piège, limiteur de débit en
  échec fermé, réponse uniforme.
- Veille protégée contre la SSRF (DNS, redirections, taille, type, entités
  XML) ; données externes isolées dans les prompts IA.
- Médias : signature binaire vérifiée à l'import ; fichiers privés jusqu'à la
  publication.
- Supabase : vues en `SECURITY INVOKER`, droits par colonne pour le rôle
  anonyme, fonctions `SECURITY DEFINER` à `search_path` vide, buckets
  State of BIB privés et lecture anonyme des tables de données retirée.
- Vulnérabilités de dépendances de production : 234 → 0 (`pnpm audit`).

## Versions antérieures

Les entrées ci-dessous reprennent le journal d'origine ; seuls les intitulés
de catégories ont été normalisés. Aucun tag Git ne leur correspond et
`package.json` indique `0.3.0` : les numéros et les dates sont ceux du journal
d'origine.

## [0.13.0] — 2026-05-18

### Fixed

- Fix cron

## [0.12.0] — 2026-04-25

### Added

- Add images.
- fix translation
- update content
- fix ui/ux mobile

## [0.12.0] — 2026-04-25

### Added

- Fix broken urls for images.

## [0.11.0] — 2026-04-25

### Added

- Add Internationalisation

## [0.10.0] — 2026-04-17

### Added

- Create CI workflows
- Remove animation data-reveal
- Update environment variables
- Add @vercel/analytics
- Update README

## [0.8.0] — 2026-04-17

### Added

- Fix build on main branch

## [0.7.0] — 2026-04-16

### Added

- Add social media links
- Update newsletter content
- Rename file

## [0.6.0] — 2026-04-15

### Added

- Bug fixes
- Update footer menu content

## [0.5.0] — 2026-04-13

### Added

- Bug fixes
- Add Luma iframe
- Increase Next.js config limits

## [0.4.0] — 2026-04-12

### Added

- Bug fixes
- Rename Akori to AnbaChain

## [0.3.0] — 2026-04-07

### Added

- Add member dashboard
- Add login page
- Add register page
- Fix middleware functionality
- Upgrade global CSS

## [0.2.0] — 2026-04-05

### Added

- Configure better-auth
- Configure Supabase
- Configure Brevo
- Configure Sanity

## [0.2.0] — 2026-04-05

### Added

- Fix build error

## [0.2.0] — 2026-04-05

### Added

- Configure better-auth
- Configure Supabase
- Configure Brevo
- Configure Sanity

## [0.2.0] — 2026-03-02

### Added

- Project architecture
- All sections

## [0.1.0] — 2026-02-28

### Added

- Initialize Next.js 15 project with App Router and TypeScript
- Configure Tailwind CSS with custom color palette
- Complete folder and file structure (public routes, members, auth, API)
- Configure `next.config.ts` with security headers and CDN remotePatterns
- Configure strict `tsconfig.json` with `@/*` alias
- Global CSS variables in `globals.css`
- Root layout `src/app/layout.tsx` with Inter font and base metadata
- Placeholder homepage `src/app/page.tsx`
- Custom 404 page `src/app/not-found.tsx`
- Utilities in `src/lib/utils.ts` (cn, formatDate, formatCurrency, truncate)
- Global types in `src/types/index.ts` (Plan, Sector, Profile, PartnerType)
- `.env.example` file with all required variables
- Prettier configuration with Tailwind plugin
- ESLint configuration
- Dependencies:
  - `next-sanity`, `@sanity/image-url`, `@sanity/client`
  - `better-auth`
  - `@supabase/supabase-js`, `@supabase/ssr`
  - `stripe`, `@stripe/stripe-js`
  - `@getbrevo/brevo`
  - `react-hook-form`, `zod`, `@hookform/resolvers`
  - `clsx`, `tailwind-merge`, `lucide-react`, `date-fns`

[Unreleased]: https://github.com/Pheniiix-Ankh-Group-Inc/akori/compare/main...develop
