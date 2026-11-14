# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Design — charte éditoriale (novembre 2026)

Application de la maquette validée, sur toutes les pages publiques et
l'administration. Aucune donnée ni affirmation nouvelle : seuls des textes
existants, des contenus publiés dans Supabase et les chiffres du dernier
instantané State of BIB sont affichés.

#### Changed

- Charte claire : ivoire `#FAF8F4`, encre `#141414`, or `#8A6A2F` ;
  Fraunces (titres) et Inter (texte) via `next/font` ; contraste AA vérifié
  (texte atténué 5,4:1, or 4,7:1 sur ivoire).
- En-tête sticky avec menu mobile (bouton accessible, `aria-current`),
  sélecteur FR/EN/ES qui conserve la page, bouton « S'abonner ».
- Accueil : hero, prémisse, Explorer BIB, événements à venir, BIB en action
  (si rétrospectives publiées), indicateurs State of BIB, newsletter.
- À propos (`/fondateurs`) : prémisse et fondateurs ; profils restylés.
- Événements : en cours, à venir, passés (avec lien de rétrospective) ;
  fiche en deux colonnes avec encadré pratique et une seule pastille d'état.
- BIB en action : rétrospective vedette, grille, témoignages ; fiche avec
  vidéo, récit, galerie et témoignages.
- State of BIB : faits de l'instantané (licence des données CC BY 4.0),
  indicateur principal, analyse publiée, cinq mouvements ; carte et
  graphiques recolorés (ivoire → or, encre).
- Administration et connexion : même charte, rubrique courante signalée.
- Pied de page limité aux pages existantes.

#### Removed

- Sections décoratives de l'ancien thème sombre (`src/components/bib/*`,
  `bib.css`, curseur, parallaxe, défilements, filigrane) et le composant
  `HomeModules`. Le registre `src/lib/content/claims.ts` reste en place, mais
  ces sections ne sont plus rendues : `HOME_SHOW_UNVERIFIED_SECTIONS` n'a donc
  plus d'effet visible.
- Pages vides `about`, `mission`, `membership`, `resources`, `press`,
  `contact` : elles redirigent vers À propos.
- Bandeau défilant et colophon de State of BIB (numéro de bloc, textes
  décoratifs non sourcés).

### Remédiation (audit de la branche, novembre 2026)

Corrections ciblées sans refonte UI/UX ; détail et preuves :
`docs/audits/BIB_REMEDIATION_REPORT.md`.

#### Security

- CSP construite à partir de `NEXT_PUBLIC_SUPABASE_URL` (connect, img, media),
  sans Sanity ni joker ; `object-src 'none'`, `base-uri`, `form-action`,
  `frame-ancestors` ; HSTS sans `preload` ; `X-XSS-Protection` retiré,
  `Referrer-Policy` et `Cross-Origin-Opener-Policy` ajoutés.
- `SobMap` et `SobCohort` : plus d'`innerHTML` sur des données.
- Limiteur de débit partagé en échec fermé (503) en production ; IP validées.
- Veille : récupération protégée contre la SSRF (DNS, redirections, taille,
  type, entités XML).
- Médias et preuves : signature binaire réelle vérifiée à l'import.
- Moteur IA : réponses tronquées refusées, un seul nouvel essai sur 429/5xx,
  budget de jetons, données externes délimitées comme non fiables.
- Journaux structurés avec masquage des e-mails, jetons et clés.

#### Fixed

- Publications transactionnelles (migration 0006) : fiche + traductions +
  audit en une transaction, verrou optimiste, galerie remplacée sans perte,
  transitions conditionnelles et idempotentes, médias non diffusables refusés
  en base, suppression d'un média publié interdite, politiques Storage
  durcies, rapport de réconciliation médias ↔ Storage en lecture seule.
- State of BIB (migration 0007) : la préparation crée une candidate privée ;
  la publication n'a lieu qu'après fusion de la PR, avec vérification des
  empreintes SHA-256 du commit approuvé ; repli ; publication non vérifiée
  révoquée.
- Newsletter (migration 0008) : validation atomique de la paire FR/EN,
  éditions validées immuables, envois confirmés définitifs, fenêtre revérifiée
  avant chaque envoi, cycle interrompu figé sans renvoi, états de demande de
  consentement tracés avant l'appel Brevo.
- Jour d'envoi de la newsletter corrigé (mercredi 9 h, heure de Toronto).
- Contenus non sourcés de l'accueil masqués par défaut (registre central).

#### Added

- IA prête à l'emploi : préréglages `anthropic` (modèle par défaut), `openai`,
  `mistral`, `openai-compatible`, et `mock` (simulation sans clé, interdite en
  production) ; `/api/ops/ai-status` (diagnostic GET, test de clé POST, non journalisé).
- Tests : Vitest (99 tests), unittest du pipeline, suites SQL/RLS sur base
  jetable ; CI étendue (job `sql`, en-têtes servis).
- `supabase/ops/` : préflight de conflits de noms, inventaire en lecture seule,
  modèle de nettoyage bloqué.
- Documentation : `SECURITY.md`, `TEST_PLAN.md`, `SUPABASE_MIGRATION_PLAN.md`,
  `OPERATIONS_RUNBOOK.md`, `EDITORIAL_CLAIMS.md`, rapport de remédiation.

### Architecture cible

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
