# Changelog

Toutes les modifications notables de ce projet sont documentées ici.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).  
Ce projet suit [Semantic Versioning](https://semver.org/lang/fr/).

---

## [Non publié]

### En cours
- Section 4 — Sanity.io (schémas, Studio, GROQ, revalidation)
- Section 5 — Supabase (tables, RLS, clients)
- Section 6 — Better-Auth (auth, middleware, OAuth)
- Section 7 — Stripe (checkout, webhook, portail)
- Section 8 — Lu.ma (billetterie, embed, codes promo)
- Section 9 — Brevo (DNS, templates, helper)
- Section 10 — Pages publiques
- Section 11 — Espace membre

---

## [0.1.0] — 2026-02-28

### Ajouté
- Initialisation du projet Next.js 15 avec App Router et TypeScript
- Configuration Tailwind CSS avec palette de couleurs personnalisée
- Structure complète des dossiers et fichiers (routes publiques, membres, auth, API)
- Configuration `next.config.ts` avec headers de sécurité et remotePatterns CDN
- Configuration `tsconfig.json` strict avec alias `@/*`
- Variables CSS globales dans `globals.css`
- Layout racine `src/app/layout.tsx` avec police Inter et metadata de base
- Page d'accueil placeholder `src/app/page.tsx`
- Page 404 custom `src/app/not-found.tsx`
- Utilitaires `src/lib/utils.ts` (cn, formatDate, formatCurrency, truncate)
- Types globaux `src/types/index.ts` (Plan, Sector, Profile, PartnerType)
- Fichier `.env.example` avec toutes les variables requises
- Configuration Prettier avec plugin Tailwind
- Configuration ESLint
- Premier déploiement Vercel connecté à GitHub

### Dépendances ajoutées
- `next-sanity`, `@sanity/image-url`, `@sanity/client`
- `better-auth`
- `@supabase/supabase-js`, `@supabase/ssr`
- `stripe`, `@stripe/stripe-js`
- `@getbrevo/brevo`
- `react-hook-form`, `zod`, `@hookform/resolvers`
- `clsx`, `tailwind-merge`, `lucide-react`, `date-fns`