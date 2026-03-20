# AnbaChain

Premium community platform for Black professionals in blockchain and Web3 technologies.

## Tech Stack

|        Layer        |            Technology               |
|---------------------|------------------------------------|
| Framework           | Next.js 15 — App Router + TypeScript |
| Styling             | Tailwind CSS                       |
| CMS                 | Sanity.io                          |
| Authentication      | Better-Auth (open source)          |
| Database            | Supabase — PostgreSQL              |
| Payments            | Stripe                             |
| Ticketing           | Lu.ma                              |
| Emails              | Brevo                              |
| Hosting             | Vercel                             |
| DNS + Security      | IONOS                              |

## Prerequisites

- Node.js 20 LTS
- pnpm 9+
- Git

## Installation

```bash
# Clone the repository
git clone https://github.com/Pheniiix-Ankh-Group-Inc/akori.git
cd [akori]

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in values in .env.local


Environment Variables

Copy .env.example to .env.local and fill in each value.

| Variable                        | Service     |
| ------------------------------- | ----------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase    |
| `BETTER_AUTH_SECRET`            | Better-Auth |
| `STRIPE_SECRET_KEY`             | Stripe      |
| `BREVO_API_KEY`                 | Brevo       |


Run the Project
# Development
pnpm dev
# http://localhost:3000

# Production build
pnpm build

# Lint
pnpm lint

Project Structure
src/
├── app/
│   ├── (public)/        ← Public pages
│   ├── (members)/       ← Member area (protected)
│   ├── (auth)/          ← Login / Register
│   ├── studio/          ← Sanity Studio → /studio
│   └── api/             ← Route Handlers
├── components/          ← React components
├── lib/                 ← Service clients (Sanity, Supabase, Stripe...)
└── types/               ← Global TypeScript types

sanity/
└── schemas/             ← Sanity content schemas



Sanity Studio Access

In development: http://localhost:3000/studio
Access is restricted to users invited via Sanity Manage.

Deployment

The project is automatically deployed on Vercel with each push to main.

PR branches generate a preview environment automatically.

# Manual deployment (if needed)
vercel --prod

Environments

| Environment | Branch    | URL                              |
| ----------- | --------- | -------------------------------- |
| Production  | `main`    | `https://www.anbachain.org`      |
| Preview     | `develop` | `https://akori-kappa.vercel.app` |
| Local       | —         | `http://localhost:3000`          |


Git Conventions

feat:     new feature
fix:      bug fix
chore:    maintenance, dependencies
docs:     documentation
style:    formatting, CSS
refactor: refactoring without functional changes
test:     add or update tests

Examples:

feat: add member directory page
fix: fix Stripe webhook plan not updating
chore: update dependencies
docs: add Sanity instructions to README


Security

 .  Never commit .env.local
 .  SUPABASE_SERVICE_ROLE_KEY must only be used in Route Handlers (never client-side)
 .  RLS enabled on all sensitive Supabase tables
 .  Stripe and Sanity webhooks verified using HMAC signatures


```

## Team

|       Rôle            |                    Contact                 |
| --------------------- |--------------------------------------------|
| `Co-Founder`          | [Fadjiah Collin] — [contact@anbachain.org] |
| `Co-Founder`          | [Brice MIMIFIR]  — [contact@anbachain.org] |
| `Developer`           | [Brice MIMIFIR]  — [contact@anbachain.org] |


 
