# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### In Progress

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