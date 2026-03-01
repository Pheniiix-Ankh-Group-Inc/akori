# AKORI

Plateforme communautaire premium pour les professionnels noirs de la blockchain et des technologies Web3.

## Stack technique

|          Couche          |            Technologie               |
|--------------------------|--------------------------------------|
|        Framework         | Next.js 15 — App Router + TypeScript |
|         Style            |             Tailwind CSS             |
|          CMS             |              Sanity.io               |
|          Auth            |        Better-Auth (open source)     |
|      Base de données     |        Supabase — PostgreSQL         |
|        Paiements         |                Stripe                |
|       Billetterie        |                Lu.ma                 |
|          Emails          |                Brevo                 |
|       Hébergement        |                Vercel                |
|       DNS + Sécurité     |               Cloudflare             |

## Prérequis

- Node.js 20 LTS
- pnpm 9+
- Git

## Installation
```bash
# Cloner le dépôt
git clone https://github.com/[username]/[nom-plateforme].git
cd [nom-plateforme]

# Installer les dépendances
pnpm install

# Copier les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local
```

## Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir chaque valeur.

| Variable                        | Service    |       Section      |
|---------------------------------|------------|--------------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity     |       Section 4    |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase   |       Section 5    |
| `BETTER_AUTH_SECRET`            | Better-Auth|       Section 6    |
| `STRIPE_SECRET_KEY`             | Stripe     |       Section 7    |
| `BREVO_API_KEY`                 | Brevo      |       Section 9    |

Voir `.env.example` pour la liste complète.

## Lancer le projet
```bash
# Développement
pnpm dev
# http://localhost:3000

# Build production
pnpm build

# Linter
pnpm lint
```

## Structure du projet
```
src/
├── app/
│   ├── (public)/        ← Pages publiques
│   ├── (membres)/       ← Espace membre (protégé)
│   ├── (auth)/          ← Connexion / Inscription
│   ├── studio/          ← Sanity Studio → /studio
│   └── api/             ← Route Handlers
├── components/          ← Composants React
├── lib/                 ← Clients services (Sanity, Supabase, Stripe...)
└── types/               ← Types TypeScript globaux

sanity/
└── schemas/             ← Schémas de contenu Sanity
```

## Accès Sanity Studio

En développement : `http://localhost:3000/studio`  
En production : `https://[domaine].io/studio`

Accès réservé aux membres invités dans Sanity Manage.

## Déploiement

Le projet se déploie automatiquement sur Vercel à chaque push sur `main`.

Les branches de PR génèrent un environnement de preview automatique.
```bash
# Déployer manuellement (si nécessaire)
vercel --prod
```

## Environnements

| Environnement | Branche  | URL                         | Stripe    |
|---------------|----------|-----------------------------|-----------|
| Production    | `main`   | `https://[domaine].io`      | Clés LIVE |
| Preview       | toute PR | `https://[hash].vercel.app` | Clés TEST |
| Local         |    —     | `http://localhost:3000`     | Clés TEST |

## Conventions Git
```
feat:     nouvelle fonctionnalité
fix:      correction de bug
chore:    maintenance, dépendances
docs:     documentation
style:    formatage, CSS
refactor: refactorisation sans changement fonctionnel
test:     ajout ou modification de tests
```

Exemples :
```
feat: ajouter page annuaire membres
fix: corriger webhook Stripe plan non mis à jour
chore: mettre à jour dépendances
docs: ajouter instructions Sanity dans README
```

## Sécurité

- Ne jamais commiter `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` uniquement dans les Route Handlers (jamais côté client)
- RLS activé sur toutes les tables Supabase sensibles
- Webhooks Stripe et Sanity vérifiés par signature HMAC

Pour signaler une vulnérabilité : security@[domaine].io

## Équipe

|          Rôle         |     Contact.    |
|-----------------------|-----------------|
| Fondateur / Product   | [Nom] — [email] |
| Développeur freelance | [Nom] — [email] |
| Éditeur Sanity        | [Nom] — [email] |