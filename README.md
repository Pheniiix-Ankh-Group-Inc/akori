# Black in Blockchain (BIB)

Black in Blockchain is a multilingual community platform focused on blockchain education, events, and data-driven insights. This repository contains its **public website, private editorial administration, data pipelines, and automation**.

> This README documents the software and its operational state. It does not replace the community's approved mission statement or editorial positioning.

## Contents

- [Overview](#overview)
- [Implementation and operational status](#implementation-and-operational-status)
- [Technology stack](#technology-stack)
- [Features](#features)
- [Data flows](#data-flows)
- [Repository structure](#repository-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Supabase](#supabase)
- [Automation](#automation)
- [Deployment](#deployment)
- [Security](#security)
- [Versions and releases](#versions-and-releases)
- [Known gaps](#known-gaps)
- [Further documentation](#further-documentation)
- [License](#license)

## Overview

The platform includes:

- A **public website** in English (default, unprefixed), French, and Spanish.
- **Community events** sourced from Luma and synchronized into Supabase.
- **BIB in Action**: event recaps, photos, videos, and testimonials.
- **State of BIB**: an interactive observatory of open-source developer activity across Africa and the Caribbean.
- A **French/English newsletter** powered by Brevo.
- **Invitation-only administration** at `/admin`.

This repository (`Pheniiix-Ankh-Group-Inc/BiB`) contains a Next.js application, Supabase SQL migrations and tests, a Python data pipeline, and GitHub Actions workflows. It does **not** provision cloud resources or contain live credentials.

## Implementation and operational status

**Implemented does not mean live.** Status checked on **November 24, 2026** against the shared Supabase project `akori`, Vercel and GitHub.

| Module | Code | Live state (Nov 24, 2026) |
| --- | --- | --- |
| Public website (EN/FR/ES), landing page | Yes | Deployed; `main` = production, `develop` = Preview |
| Events (Luma → Supabase) | Yes | Sync runs succeed; 1 event stored (Ed. 2, March 26, 2026), none upcoming |
| BIB in Action | Yes | No recap, media or testimonial published yet |
| State of BIB pipeline and page | Yes | 7 versions published automatically; latest `20261123T130700` |
| AI-generated State of BIB insights | Yes | Not running: no AI provider configured |
| Newsletter (DOI, editorial cycle, delivery) | Yes | Not running: subscriptions disabled (flag and pepper unset), no news source, no AI provider |
| Startup Spotlight | Yes | Page live, no portrait published yet (not indexed) |
| Editorial administration | Yes | One editor provisioned |
| Release process | Yes | Tags and GitHub releases from `0.14.0` on (see [Versions and releases](#versions-and-releases)) |

Until a valid State of BIB version is readable server-side, its public interface displays an **unavailable state**, not unsubstantiated statistics. Preview deployments need `SUPABASE_SECRET_KEY` in the Vercel Preview environment to show the data.

## Technology stack

| Layer | Technology |
| --- | --- |
| Application | Next.js 16.4 (App Router), React 19.2, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 and project stylesheets (`globals.css`, `state-of-bib.css`, `admin.css`) |
| Internationalization | next-intl 4; `en` (default), `fr`, `es` |
| Database | Supabase PostgreSQL, row-level security (RLS), transactional RPCs |
| Authentication | Supabase Auth; invited editors/admins only; public registration disabled |
| Files and datasets | Supabase Storage for media, consent evidence, and State of BIB artifacts |
| Events | Luma embedded calendar and iCalendar feed |
| Newsletter | Brevo server-side API and double opt-in |
| Data processing | Python 3.12, DuckDB, pandas (`data-pipeline/`) |
| AI | Configurable provider: `anthropic`, `openai`, `mistral`, `openai-compatible`, `mock` |
| Data visualizations | D3, TopoJSON, world-atlas |
| CI and scheduling | GitHub Actions |
| Hosting | Vercel |
| Measurement | Vercel Web Analytics and Speed Insights (Core Web Vitals; enable Speed Insights in the Vercel project) |

Package manager: **pnpm 10** with `pnpm-lock.yaml`. Runtime: Node.js **24.x** (`engines`).

## Features

### Public website

- **Home** is a single landing page with anchored sections: about and founders, activities, commitments, upcoming events, BIB in Action (with published testimonials), a State of BIB teaser (key figures and the five most active cities), the newsletter and a closing call to action. Unverified claims stay hidden (`src/lib/content/claims.ts`, `HOME_SHOW_UNVERIFIED_SECTIONS`).
- **Pages:** About (`/about`, including the founders section; `/fondateurs` permanently redirects to `/about#fondateurs`, founder profiles stay at `/fondateurs/brice` and `/fondateurs/fadjiah`), Mission, Events, BIB in Action, State of BIB, Startup Spotlight, Resources, Press, Contact, Data sources, and legal pages (`/terms`, `/privacy`, `/cookies`).
- **Membership** (`/membership`) is still a placeholder and is excluded from search indexing.
- **Localization:** State of BIB country names (from ISO codes) and common city exonyms are shown in French and Spanish; Luma's English iCal boilerplate ("Get up-to-date information", "Address", "Hosted by") is parsed and shown in every language with translated labels; the organizer's own free text keeps its language unless a translation is entered in `/admin/evenements`.
- **404:** unknown public URLs render a localized not-found page with the site header and footer.
- **Editorial visuals** (`src/lib/editorial/visuals.ts`) are currently low-resolution previews awaiting HD files.

### Events, calendar, and history

- **Luma is the source of truth.** Events are created in Luma; admins can edit only BIB-specific editorial additions (approved cover imagery and translated descriptions).
- The `/evenements` page combines the embedded Luma calendar with synchronized events, list/month views, filters, paginated history, cancellation indicators, and links to event recaps.
- The iCalendar parser supports RFC 5545 features including time zones, all-day events, `RRULE`, `RDATE`, `EXDATE`, and `RECURRENCE-ID`.
- A missing event is **marked as absent, not deleted**. A cancelled event retains its cancellation state.
- Older events not exposed by the feed can be imported from a Luma `.ics` export in `/admin/evenements`. The feed alone cannot guarantee complete historical coverage.
- Attendee, ticket, and payment data are **not imported**.
- Synchronization is protected by an **atomic database lock**. Missing migration 0012, empty/invalid feeds, and concurrent or failed runs are handled explicitly; the cron route does not report a skipped run as successful.

### BIB in Action

Event recaps, media galleries, videos, and testimonials include consent references. Media remains private until it is referenced by published content **and** its usage rights have been approved. Retraction removes the public copy when no longer needed.

### State of BIB

- Interactive maps, trends, rankings, and cohorts with URL-persisted filters, in EN/FR/ES.
- Geographic scope: **Africa and the Caribbean (76 countries and territories)**. The figures **do not measure the diaspora**.
- **No public dataset downloads:** no CSV/JSON export or public artifact endpoints. Provider details, methodology, and licensing are restricted to `/data-sources`.
- The pipeline is designed for **fully automated publication** in `auto` mode, without mandatory human approval.
- Supabase is the primary source for the current published dataset. `data/state-of-bib/current/` is a **private technical fallback**, not a public dataset. It can be used only if internally consistent, from a known source, and less than 120 days old. The committed copy is published version `20261118T130441` (SHA-256 identical to the Supabase artifacts); it is refreshed manually and is rejected again once older than 120 days.
- Post-publication checks now use `verify_current_dataset` directly and independently reread the six private artifacts with SHA-256 validation. This is a **database/Storage integrity check**, not proof that every visitor sees the latest version immediately; public visibility still requires HTTP/E2E validation.

### AI-generated insights

Short State of BIB analyses are generated in EN/FR/ES for a specific published dataset version. Numeric facts are inserted from data placeholders rather than invented by the model. Independent checks enforce direction, scope, and editorial rules. Insights cannot be displayed against a mismatched dataset version. A failed insight does not remove otherwise valid statistics.

### Newsletter

| Stage | Behavior |
| --- | --- |
| Subscription | FR/EN forms, explicit consent, and Brevo double opt-in |
| News sources | Editors configure RSS/Atom sources and reuse conditions in `/admin/newsletter/sources`; **none are preconfigured** |
| Automated drafting | Monday: FR/EN drafts covering Blockchain Insights, Blockchain News, BIB Events, BIB Highlights |
| Editorial checks | Tuesday: non-AI validation with bounded regeneration |
| Optional human review | Editors can edit copy, items, and ordering in `/admin/newsletter/[id]`; edits are revalidated |
| Autonomous sending | Wednesday at 09:00 `America/Toronto`, only when `FEATURE_NEWSLETTER_AUTOSEND=true` **and** the mode permits it; no late catch-up |
| Manual sending | An admin may send a validated edition after explicit confirmation, independently of the autosend flag |

Automation modes (`/admin/automatisations`): `auto` (eligible autonomous sending), `review` (**current mode**, admin approval required), and `paused` (no generation or sending).

### Administration

The invitation-only `/admin` area includes event sync history and editorial additions, `.ics` import, BIB in Action, media/rights, testimonials, State of BIB monitoring and recovery, newsletters, automation modes, incidents, and audit history.

### Observability

Structured logs redact addresses, tokens, and keys. Operational telemetry includes `ops_incidents`, `event_sync_runs`, `ingestion_runs`, and `editorial_audit`. Optional internal email alerts are controlled by `FEATURE_OPS_ALERTS`.

## Data flows

```text
Events
  Luma iCal feed ── GitHub Actions (events-sync, every 10 min after activation on main)
                     └─ POST /api/cron/luma-sync ── Supabase ── BIB website
  Luma embedded calendar ────────────────────────────── BIB website

State of BIB
  Electric Capital Open Dev Data manifest
    └─ GitHub Actions (refresh-data, hourly)
         ├─ check     compare source version and resource digests
         ├─ build     Python / DuckDB → six JSON artifacts → validation
         │            → Supabase PostgreSQL + private Storage → publication
         └─ finalize  reconcile → POST /api/cron/sob-refresh
                      (cache invalidation, direct PostgreSQL/Storage verification,
                       AI insight cycle; public visibility not guaranteed)
  Supabase ── server-side read ── State of BIB page

Newsletter
  Approved RSS/Atom sources ── daily ingestion
    └─ Supabase ── AI drafting ── FR/EN editions ── deterministic checks
         └─ optional human review ── Brevo ── subscribers
```

## Repository structure

| Path | Purpose |
| --- | --- |
| `src/app/[locale]/(public)` | Localized public routes |
| `src/app/(operateurs)` | Authentication and private administration |
| `src/app/api` | Newsletter subscription, scheduled endpoints, operational diagnostics |
| `src/components` | Public, State of BIB, and admin UI components |
| `src/lib` | Domain logic: `events`, `sob`, `newsletter`, `news`, `ai`, `auth`, `supabase`, `ops` |
| `src/messages` | EN/FR/ES translations |
| `data-pipeline` | Python/DuckDB pipeline and unit tests |
| `data/state-of-bib` | Internal current snapshot and historical copies |
| `supabase/migrations` | Versioned schema changes |
| `supabase/tests` | SQL/RLS tests on disposable PostgreSQL |
| `supabase/ops`, `supabase/bootstrap` | Operator scripts and first-admin provisioning |
| `tests` | Vitest tests and Playwright browser tests |
| `.github/workflows` | CI and scheduled workflows |
| `docs` | Architecture, operations, security, and rollout guides |

## Local development

Prerequisites: Node.js 24.x, pnpm 10, and optionally Python 3.12 and local PostgreSQL for pipeline/SQL tests.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local  # placeholder values only
pnpm dev                    # http://localhost:3000
```

Without Supabase configuration, the public shell still starts. Events and BIB in Action show empty states, State of BIB shows its unavailable state, and administration remains inaccessible.

```bash
pnpm lint
pnpm typecheck
pnpm test          # offline unit/security tests
pnpm build
pnpm check         # lint + typecheck + tests + build

# Python data pipeline
pip install -r data-pipeline/requirements.txt
python -m unittest discover -s data-pipeline/tests

# SQL/RLS on DISPOSABLE PostgreSQL only (real Supabase URLs are rejected)
PGURL=postgresql://postgres@localhost:5432/postgres pnpm test:sql

# Browser E2E, with the site running
BASE_URL=http://localhost:3000 pnpm test:e2e
BASE_URL=http://localhost:3000 SOB_EXPECT=unavailable pnpm test:e2e:rules
```

Offline suites do not send requests to real Luma, Brevo, AI, or dataset-provider accounts. See [Test Plan](docs/TEST_PLAN.md).

## Environment variables

The complete reference is [.env.example](.env.example); see [deployment variable matrix](docs/DEPLOYMENT.md#13-matrice-des-variables). **Never commit real credentials.**

### Application (Vercel)

| Variable | Purpose | Required when | Default / failure mode | Secret |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical application URL | Production | `http://localhost:3000` | No |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dedicated BIB Supabase project | Data and admin features | Supabase access unavailable | No |
| `SUPABASE_SECRET_KEY` | Server-side privileged data access | State of BIB, sync, newsletter | Server workflows unavailable | **Yes** |
| `CRON_SECRET` | Authenticates `/api/cron/*` (min. 32 chars) | Scheduled jobs | Requests rejected | **Yes** |
| `NEXT_PUBLIC_LUMA_CALENDAR_ID` | Embedded Luma calendar | Luma UI | `cal-aqEzCpUP5LXSBcL` | No |
| `LUMA_ICAL_URL` | `https://api.lu.ma/ics/get?entity=calendar&id=cal-aqEzCpUP5LXSBcL` (owner-confirmed) | Luma synchronization | Verified BIB fallback if unset; different calendar IDs remain candidates | No |
| `FEATURE_SOB_READ_FROM_SUPABASE` | Use published Supabase State of BIB data | Normally enabled | `true` | No |
| `SOB_INSIGHTS_MAX_ATTEMPTS` | AI insight attempts per version/locale | Optional | `3` | No |
| `FEATURE_AI`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL` | AI engine | AI features | Disabled by default | No |
| `AI_API_KEY` | AI provider credential | AI enabled | AI unavailable | **Yes** |
| `BREVO_API_KEY` | Brevo server API | Newsletter | Subscribe/send unavailable | **Yes** |
| `BREVO_LIST_ID_FR/EN`, `BREVO_DOI_TEMPLATE_ID_FR/EN`, `BREVO_SENDER_EMAIL/NAME` | Brevo lists, DOI templates, sender | Newsletter | Unconfigured | No |
| `NEWSLETTER_EMAIL_HASH_PEPPER` | Email/IP hashes (min. 32 chars) | Subscriptions | HTTP 503 on signup | **Yes** |
| `FEATURE_NEWSLETTER_SUBSCRIBE`, `FEATURE_NEWSLETTER_AUTOSEND`, `FEATURE_NEWS_INGEST`, `FEATURE_OPS_ALERTS` | Feature activation | Optional | `false` | No |
| `GITHUB_DISPATCH_TOKEN` | Optional workflow dispatch from admin | Admin-triggered jobs | Dispatch unavailable | **Yes** |
| `GITHUB_REPOSITORY_SLUG`, `GITHUB_DISPATCH_REF` | Repository and branch for admin dispatch | Optional | `Pheniiix-Ankh-Group-Inc/BiB`, `main` | No |

### Workflows (GitHub Actions)

| Variable | Type | Purpose | Required when |
| --- | --- | --- | --- |
| `BIB_SCHEDULES_ENABLED` | Variable | `true` enables eligible scheduled jobs | Only when activating schedules |
| `BIB_SITE_URL` | Variable | Production HTTPS base URL for cron callbacks | Scheduled production jobs |
| `BIB_CRON_SECRET` | Secret | Must match Vercel Production `CRON_SECRET` | Scheduled production jobs |
| `BIB_STAGING_SITE_URL` | Variable | Optional HTTPS Preview URL; manual news/newsletter workflows require it | Manual Preview runs |
| `BIB_STAGING_CRON_SECRET` | Secret | Must match Preview `CRON_SECRET` when Preview target is configured | Manual Preview runs |
| `SOB_SUPABASE_SYNC` | Variable | `true` explicitly allows State of BIB pipeline writes | State of BIB publishing |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Secrets | Database target for State of BIB pipeline | State of BIB publishing |
| `SOB_CHECK_INTERVAL_HOURS`, `SOB_STRONG_VARIATION`, `SOB_MAX_FAILED_ATTEMPTS`, `SOB_MAX_BLOCKED_ATTEMPTS`, `SOB_BLOCKED_RETRY_HOURS`, `SOB_VERIFY_B3` | Variables | Check cadence, guardrails, retries | Optional; see [automation guide](docs/SOB_AUTOMATION.md) |

**Single Supabase project (owner decision):** Both Preview and Production may point to the existing **`akori`** project (`zwfyuhgnbdrjhetkyanj`). There is **no separate staging database**, so Preview writes affect the same real data. Use test-only media, contacts and editorial content; never perform destructive migration or rollback drills against the shared database. Separate Preview/Production `CRON_SECRET` values and Brevo test lists still provide operational protection. The presence of GitHub/Vercel secrets has not been verified, and the CI only checks that server secret names are absent from the client bundle.

## Supabase

The previously inspected `akori` project is dedicated to BIB. Do not reuse a database belonging to a different product.

### Migrations

Fifteen migrations are recorded as applied on `akori` (November 24, 2026), including the State of BIB historical deltas and the privileged-RPC hardening of November 22. Applied migrations must **never be rewritten or replayed**. Migration 0010 is a separately operated legacy cleanup script, not a regular `db push` migration.

| No. | Name | Purpose |
| --- | --- | --- |
| 0001 | `core_admin` | Editor roles, audit, permission helpers |
| 0002 | `events` | Events and localized copy |
| 0003 | `bib_en_action` | Recaps, media, testimonials, Storage buckets |
| 0004 | `state_of_bib` | Sources, versions, artifacts, observations, insights |
| 0005 | `newsletter_ai` | News ingestion, cycles, editions, AI, incidents |
| 0006 | `editorial_integrity` | Transactional publishing, optimistic locking |
| 0007 | `sob_governance` | Private candidates, checksum validation |
| 0008 | `newsletter_integrity` | Atomic FR/EN pair, immutable approved editions |
| 0009 | `security_hardening` | `SECURITY INVOKER` views, column permissions, indexes |
| 0010 | `legacy_koriventure_cleanup` | Separate cleanup script in `supabase/ops/akori/sql/` |
| 0011 | `bib_v2_automation` | Automation modes, Luma ingestion, publication RPC |
| 0012 | `bib_finalisation` | Private buckets, anonymous access restrictions, atomic Luma lock |
| 0013 | `sob_full_auto` | `auto` mode, publishing lock, quarantine, verification |

### Data security

- **RLS on all tables.** Public users can read only permitted published content; State of BIB raw data remains server-side.
- **Storage:** `bib-media-public` is for rights-approved published media. `bib-media-drafts`, `bib-consents`, `bib-sob-snapshots`, and `bib-sob-candidates` are private.
- **Privileged RPCs:** `sync_luma_events`, `begin_event_sync_run`, `publish_dataset_candidate`, and `verify_current_dataset` use `SECURITY DEFINER` with a restricted `search_path`. Business errors use `BIB01`–`BIB09`.

### Initial administrator

No account receives admin privileges automatically. Follow [first_editor.sql](supabase/bootstrap/first_editor.sql) and the [deployment guide](docs/DEPLOYMENT.md#5-premier-opérateur) only after the target environment has been verified.

### Validation

`pnpm test:sql` runs schema migrations, RLS checks, and concurrency tests against a disposable PostgreSQL instance. See [Supabase Migration Plan](docs/SUPABASE_MIGRATION_PLAN.md).

## Automation

Schedules are gated by `BIB_SCHEDULES_ENABLED=true` and are intended to run only after the relevant workflow exists on GitHub's **default branch (`main`)**. Manual Luma dispatch uses the Preview URL/secret pair if configured; otherwise it explicitly uses the canonical site pair. Manual news/newsletter dispatches require the Preview URL/secret pair.

| Workflow | Schedule | Purpose |
| --- | --- | --- |
| `events-sync.yml` | Every 10 minutes, once enabled on `main` | Luma → Supabase events |
| `refresh-data.yml` | On a push to `main`, then hourly | Initial State of BIB build plus subsequent manifest checks/publishing |
| `news-ingest.yml` | Daily, 10:41 UTC | Ingest approved feeds |
| `newsletter.yml` | Monday/Tuesday/Wednesday and scheduled send-slot checks | Generate, review/check, and deliver validated editions |
| `ci.yml` | Pull requests to `main` and `develop`, plus manual dispatch | Static checks, tests, build, and security audit |
| `release.yml` | Manual (prepare) and on version change on `main` (publish) | Version bump, tag `vX.Y.Z`, GitHub release |

**Note:** GitHub Actions schedules and manual dispatches for workflows not present on `main` cannot be treated as already operational. A ten-minute schedule is best effort, subject to provider/API limits and GitHub Actions quotas.

### State of BIB processing

1. **Detection:** an hourly lightweight manifest check avoids downloading unchanged resources.
2. **Build and validation:** Python/DuckDB computes the metrics and verifies schema, values, dates, geography, duplicates, totals, source identity, and cross-artifact consistency.
3. **Large changes:** variations over 50% (default) trigger seven automated reinforced checks.
4. **Atomic publication:** in `auto`, only a fully validated candidate may replace the current version; concurrent writes and regressions to older versions are blocked.
5. **Post-publish integrity:** PostgreSQL/Storage checks verify the current pointer and private artifacts. The pipeline can roll back a failed publication and raise an incident.
6. **Quarantine and retries:** unconfirmed candidates are quarantined while the last valid release stays available; bounded retries are scheduled or triggered by source changes.
7. **Site refresh:** after successful database/Storage verification, invalidates tags and paths for unprefixed English and prefixed FR/ES routes, and runs the automatic AI insight cycle. No redeployment is required for the database update, but **public visibility is not verified** by the refresh endpoint.

`review` and `paused` modes remain available. See [State of BIB Automation](docs/SOB_AUTOMATION.md).

### Luma processing

The SQL-backed atomic lock prevents overlapping imports. The importer has bounded retries, rejects empty feeds and missing locks, protects against sudden drops in feed size, and records each run in `/admin/evenements`. A concurrent run is reported as **skipped (HTTP 409)** rather than a successful synchronization.

### Newsletter processing

Monday: generation. Tuesday: validation. Wednesday, 09:00 Toronto time: eligible sending. Invalid or incomplete FR/EN editions are never sent. A missed sending window is not automatically replayed; GitHub schedules can be delayed.

## Deployment

| Component | Policy |
| --- | --- |
| `develop` | Integration branch for reviewed feature/fix pull requests |
| `main` | Protected production branch; receives reviewed changes from `develop` |
| Pull requests | CI jobs `web`, `data`, `sql`; squash/rebase merge preferred |
| Vercel Preview | Branch-specific preview deployment, if connected and enabled |
| Vercel Production | Deployment of `main` |
| Database migrations | Separate, explicitly authorized operation, never run automatically by CI |

Before merging: lint, typecheck, unit tests, build, Python tests, SQL/RLS tests, and browser E2E where applicable. **Deploying code and enabling write-capable automation are separate decisions.** See [Deployment and Activation](docs/DEPLOYMENT.md).

## Security

- Restrictive CSP (including `object-src 'none'`), HSTS, and no unsafe insertion of external HTML.
- Server-side authorization on admin pages/actions and database enforcement through RLS and transactional RPCs.
- Public forms use same-origin checks, honeypots, fail-closed rate limits, uniform responses, and recorded double opt-in.
- News ingestion includes SSRF defenses; untrusted source content is isolated in AI prompts.
- Private media stays private until approved rights and publication conditions are met.

See [Security Guide](docs/SECURITY.md).

## Versions and releases

Versions follow [Semantic Versioning](https://semver.org/) and are recorded in [CHANGELOG.md](CHANGELOG.md). Every change merged into `develop` adds a line under `[Unreleased]`.

1. **Prepare** — GitHub → Actions → **Release** → *Run workflow*, action `preparer`, version `x.y.z` (or locally `pnpm release:prepare x.y.z`). The `[Unreleased]` notes become `## [x.y.z] — date`, `package.json` is bumped, and a `release: vx.y.z` pull request is opened against `develop`.
2. **Ship** — merge that pull request, then `develop` into `main` as usual.
3. **Publish (automatic)** — when the new version reaches `main`, the workflow tags that commit `vx.y.z` and publishes the GitHub release with the changelog notes. Existing tags are never moved.

Versions up to `0.13.0` are historical entries without Git tags; `0.14.0` is the first tagged release. Full procedure: [Releasing](docs/RELEASING.md).

## Known gaps

Tracked in the November 24, 2026 site audit: legal pages to rewrite (privacy policy describes data the site does not collect; publisher details missing), no upcoming event published, newsletter and AI insights not configured, no `sitemap.xml`/`robots.txt`/Open Graph image, provisional editorial visuals.

## Further documentation

| Document | Coverage |
| --- | --- |
| [V2 Target Architecture](docs/V2_ARCHITECTURE_CIBLE.md) | Luma, State of BIB, newsletter, administration |
| [State of BIB Automation](docs/SOB_AUTOMATION.md) | Pipeline, limits, retries, activation |
| [Deployment Guide](docs/DEPLOYMENT.md) | Environments, rollout steps, variable matrix |
| [Test Plan](docs/TEST_PLAN.md) | Test suites and coverage |
| [Architecture](docs/ARCHITECTURE.md) / [Data Model](docs/DATA_MODEL.md) | Components and schema |
| [Security](docs/SECURITY.md) | Application and data protections |
| [Operations Runbook](docs/OPERATIONS_RUNBOOK.md) | Monitoring and incident response |
| [Editorial Workflows](docs/EDITORIAL_WORKFLOWS.md) | Editorial procedures |
| [Supabase Migration Plan](docs/SUPABASE_MIGRATION_PLAN.md) | Migration sequencing and history |
| [Releasing](docs/RELEASING.md) | Versions, tags and GitHub releases |
| [Pre-production Readiness](docs/audits/BIB_PREPROD_READINESS.md) | Historical pre-production report (November 2026) |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## License

See [LICENSE](LICENSE).
