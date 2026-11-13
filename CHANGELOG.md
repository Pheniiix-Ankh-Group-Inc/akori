# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

Architecture cible Black in Blockchain. Les services externes sont intégrés
mais **désactivés par défaut** ; aucune migration n'a été appliquée sur une
base distante. Design et navigation inchangés.

### Added

- Migrations Supabase BIB versionnées (non appliquées) : habilitations, audit,
  événements, rétrospectives, médias, témoignages, State of BIB historisé,
  veille, IA, newsletter, incidents ; RLS sur toutes les tables ; buckets Storage.
- Authentification des opérateurs (Supabase Auth) sur `/login`, sans
  inscription publique ; administration `/admin` (événements, BIB en action,
  médias et droits, témoignages, insights, suivi newsletter) avec aperçus privés
  et journal d'audit.
- Pages publiques `/evenements/[slug]`, `/en-action`, `/en-action/[slug]` ;
  liste des événements à venir, en cours et passés (« Terminé ») ; bouton
  « S'inscrire sur Luma » seulement avec une URL Luma valide.
- Blocs d'accueil : prochains événements, BIB en action, accès State of BIB,
  inscription newsletter (FR ou EN, consentement explicite, double opt-in).
- State of BIB : validation avant publication, contrôle quotidien léger de
  version, historisation Supabase (snapshots immuables, observations, version
  courante), lecture avec repli sur les JSON embarqués.
- Veille quotidienne des sources RSS/Atom autorisées (sans IA).
- Moteur IA commun à fournisseur configurable (budget, sortie structurée).
- Newsletter autonome FR/EN : 4 rubriques, cycle lundi/mardi/mercredi 09:00
  (America/Toronto), contrôles hors IA, blocage des deux langues, annulation
  sans rattrapage, idempotence Brevo, alertes e-mail.
- Insights IA State of BIB en brouillon, publication séparée par un administrateur.
- Workflows `ci.yml` (contrôles statiques), `newsletter.yml`, `news-ingest.yml`
  (désactivés par défaut).
- Documentation : `docs/ARCHITECTURE.md`, `DATA_MODEL.md`, `DEPLOYMENT.md`,
  `EDITORIAL_WORKFLOWS.md`, `IMPLEMENTATION_REPORT.md`, `.env.example`.

### Changed

- Next.js 16.4.6, next-intl 4.15, zod 4.6, supabase-js 2.119.
- `/register` affiche que l'inscription est fermée ; `/dashboard` redirige vers `/admin`.
- `refresh-data.yml` : contrôle quotidien conditionnel au lieu d'un build
  hebdomadaire systématique ; nécessite `BIB_SCHEDULES_ENABLED=true`.
- `refresh-data.yml` ne pousse plus jamais sur `main` : les JSON régénérés sont
  proposés par pull request depuis une branche `data/state-of-bib-<version>`.
- `build_data.py` n'écrase `public/data` qu'après validation du lot complet
  (remplacement en deux phases, non atomique ; la cohérence publiée repose sur
  le commit unique de la PR ou la version Supabase courante).
- Newsletter : la paire FR/EN contrôlée le mardi est exactement celle envoyée
  le mercredi (même version, statut `validated`, contrôles finaux rejoués).
- `/api/newsletter` exige `NEWSLETTER_EMAIL_HASH_PEPPER` (≥ 32 caractères) ;
  aucune valeur de repli.
- Pipeline Supabase : clé secrète transmise uniquement dans l'en-tête `apikey`.
- Dates d'événement : format explicite compatible avec `timeZoneName`.
- Politique de confidentialité : liste des prestataires techniques mise à jour.
- Les sections d'accueil non sourcées peuvent être masquées
  (`HOME_SHOW_UNVERIFIED_SECTIONS=false`).

### Fixed

- `/login`, `/register`, `/dashboard` n'étaient plus atteignables (404).
- Erreurs ESLint (`SobMap`, `ErrorPage`, `Useparallax`) et imports inutilisés.

### Security

- Suppression de la route publique `/api/emails/welcome` (envoi arbitraire).
- Fin de la journalisation du préfixe de la clé Brevo.
- Inscription newsletter : même origine, champ piège, limitation de débit,
  double opt-in, réponse uniforme.
- Vulnérabilités de dépendances en production : 234 → 0 (`pnpm audit`).
- Clés serveur exclues du bundle client (contrôle en CI).

### Removed

- Sanity (Studio, schémas, client) — schémas archivés dans `docs/archive/`.
- better-auth, Stripe, `pg`, `styled-components`, `pnpm` (dépendance),
  `package-lock.json`, espace membres `(membres)`.

## [0.13.0] — 2026-05-18

### Fix

- fix cron

## [0.12.0] — 2026-04-25

### Added

- Add images.
- fix translation
- update content
- fix ui/ux mobile

### In Progress

## [0.12.0] — 2026-04-25

### Added

- Fix broken urls for images.

## [0.11.0] — 2026-04-25

### Added

- Add Internationalisation

---

## [0.10.0] — 2026-04-17

### Added

- Create CI workflows  
- Remove animation data-reveal  
- Update environment variables  
- Add @vercel/analytics  
- Update README  

---

## [0.8.0] — 2026-04-17

### Added

- Fix build on main branch  

---

## [0.7.0] — 2026-04-16

### Added

- Add social media links  
- Update newsletter content  
- Rename file  

---

## [0.6.0] — 2026-04-15

### Added

- Bug fixes  
- Update footer menu content  

---

## [0.5.0] — 2026-04-13

### Added

- Bug fixes  
- Add Luma iframe  
- Increase Next.js config limits  

---

## [0.4.0] — 2026-04-12

### Added

- Bug fixes  
- Rename Akori to AnbaChain  

---

## [0.3.0] — 2026-04-07

### Added

- Add member dashboard  
- Add login page  
- Add register page  
- Fix middleware functionality  
- Upgrade global CSS  

---

## [0.2.0] — 2026-04-05

### Added

- Configure better-auth  
- Configure Supabase  
- Configure Brevo  
- Configure Sanity  

---

## [0.2.0] — 2026-04-05

### Added

- Fix build error  

---

## [0.2.0] — 2026-04-05

### Added

- Configure better-auth  
- Configure Supabase  
- Configure Brevo  
- Configure Sanity  

---

## [0.2.0] — 2026-03-02

### Added

- Project architecture  
- All sections  

---

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

### Dependencies Added

- `next-sanity`, `@sanity/image-url`, `@sanity/client`  
- `better-auth`  
- `@supabase/supabase-js`, `@supabase/ssr`  
- `stripe`, `@stripe/stripe-js`  
- `@getbrevo/brevo`  
- `react-hook-form`, `zod`, `@hookform/resolvers`  
- `clsx`, `tailwind-merge`, `lucide-react`, `date-fns`  
