# Changelog

All notable changes to this project are documented here.

This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) conventions. Historical release numbers and duplicate legacy entries are preserved as originally recorded.

## [Unreleased]

### Fixed — phase 5 stabilisation (2026-11-26) — see `docs/PHASE5_STABILIZATION.md`

- CI: credit assertions follow the server-rendered attribution; every translation file is scanned for provider and licence names.
- State of BIB: shared explorer links no longer lose their filters on load; the guided tour stops on any manual interaction or filter change; the version timeline uses `is_current` and localized links; unverified history (20260419T130333) is never presented as a published version.
- Cron: a newsletter cycle already cancelled or sent is a terminal no-op; `cron_runs` records business outcomes (`details.outcome`) and only delivery failures or unusable news sources as failures.
- Workflows: no hardcoded Supabase project URL in `refresh-data.yml` (the repository variable or secret `SUPABASE_URL` is required).
- Database (not applied remotely): history marker for `20261114001000`; migration `20261126000100` indexes 3 foreign keys and consolidates RLS policies with identical rights.
- e2e: raw HTML, RSC payloads and client bundles checked for provider names and secrets.

### Changed — public branding and data confidentiality

- Remove the public header wordmark frame; keyboard focus uses a visible underline.
- Simplify the public data methodology page and its FR/EN/ES navigation labels, removing optional provider directory details while retaining the required CC BY 4.0 attribution and links. Internal collection and data processing remain unchanged.

### Changed — State of BIB data storytelling and remaining public pages (phase 4.1, 2026-11-26)

- State of BIB: map countries appear by rank, non-selected territories dim, guided tour of the five leading countries (started and stopped by the visitor; step by step with reduced motion); ecosystem curves morph between absolute and base 100 with sliding axes and a "back to start" control; cohort layers reveal bottom-up and morph between counts and shares with a computed peak annotation; animated city counts; timeline of published versions linking to each snapshot; scene index.
- PageHero variants (split, cinematic, manifesto, index); Events and Mission use the cinematic opening, Contact, Resources and Data sources the index opening.
- Startup Spotlight: cinematic opening on ink with a monumental title, a reserved portrait plane showing the real programme status, and principles as a large numbered index.
- Founder profiles (sticky portrait, reading column), retrospectives, data sources, event and story details, and error pages aligned with the system.
- Legal contents collapse on small screens (no layout shift when the list loads).
- e2e: published institutional pages must be indexable with a title; membership stays noindex.
- `docs/IMAGES.md` §8: inventory of the photographs still needed, with crops, keywords, candidates and expected files.

### Changed — pages publiques « Immersive Spatial Institution » (2026-11-26)

- Shared public system: `.pub` wrapper makes structural containers full-width, cards become open index items, square geometry, heavier titles; new `PageHero`, `LegalToc` and row-index primitives (`docs/DESIGN_SYSTEM.md`).
- About, Mission (sticky scrollytelling of the three commitments), Contact (mailto index, addresses unchanged), Press, Resources, Membership (preparation state kept), Events (photo opening, editorial index rows, calendar logic untouched) and Startup Spotlight (full width, ink waiting panel) redesigned.
- Terms, Privacy and Cookies: full-width introduction, sticky contents with active section, reading column; legal text unchanged.
- State of BIB: full-bleed opening with facts, version selector and shareable link; monumental figures of the version shown (no intermediate values announced to screen readers); history scene with diverging delta bars and the trend's period stated; note on analyses when a historical version is shown.

### Fixed

- State of BIB explorer: changing a filter dropped `?version`, so a historical snapshot was lost on the first interaction. Non-filter URL parameters are now preserved.

### Changed — accueil « Immersive Spatial Institution » (2026-11-26)

- Home page rebuilt as twelve full-bleed chapters from the Claude Design mockup (Phase 3): cinematic hero, typographic manifesto, mission with a dominant image, sticky "what we build" scrollytelling, founders with offset portraits, editorial event index (rows open on click or keyboard, Luma registration kept), Startup Spotlight programme, State of BIB data story on ink (headline figure, secondary figures, top-country bars with an accessible table, computed analysis), BIB in action, resources index and a newsletter closing on the horizon.
- Scroll-driven motion in CSS (`animation-timeline`), reversible and disabled with reduced motion; no scroll hijacking. Responsive 12/8/4-column grid, dedicated tablet and mobile compositions.
- Header and footer now span the full width; the footer moves to ink.
- New `Immersive` messages in FR/EN/ES; State of BIB date shown in long form.

### Changed — editorial imagery (2026-11-25)

- Image catalogue rewritten: each visual records its placement, role, source, licence, desktop and mobile files, focal point and status. A visual is shown only once validated and sharp enough for its slot, so the 200 px previews are no longer displayed blurred.
- `EditorialImage` uses `<picture>` with a dedicated 4:5 mobile crop (Next 16 `getImageProps`), focal point, and an empty alt for decorative images. The home hero becomes full-bleed, capped in height on 2560–3440 px screens; a full-bleed closing band is ready.
- AI visuals next to events carry a "mood visual, not a photo of a BIB event" caption in FR/EN/ES.
- New `docs/IMAGES.md`: brand analysis, photographic direction, inventory with sources and licences, generation prompts, export sizes and checks at each width. Art-direction board added to the Claude Design canvas.

### Added — monitoring, analytics and observability (2026-11-25)

- OpenTelemetry through `@vercel/otel` (`src/instrumentation.ts`, service `bib-web`): Next.js and outbound `fetch` spans, one span per measured task, sanitized `server.request_error` logs from `onRequestError`. `OTEL_SDK_DISABLED=true` turns it off.
- Business analytics events (`src/lib/analytics.ts`): newsletter confirmation and failures, BIB in Action article views and completed reads, State of BIB views, outbound clicks, admin dashboard views, login success and failure (server side, generic reasons only). Closed list, deduplicated, at most two scrubbed properties, never e-mails, tokens or personal identifiers. Custom events are recorded by Vercel on Pro plans only.
- Page-view and Speed Insights URLs are scrubbed (no query string or fragment, except `?newsletter=confirmed`); analytics now also covers the operator area.
- Scheduled-job history: new `cron_runs` table (migration `20261125000100_bib_cron_runs.sql`, to apply) filled by every `/api/cron/*` route with start, end, duration, status, items, attempt, correlation id and GitHub run id; workflows send `X-BIB-Run-Id` / `X-BIB-Run-Attempt`.
- `/api/cron/health`, scheduled daily by Vercel Cron (`vercel.json`): detects failed, missing and stuck jobs, records one `ops_incidents` alert per finding at most every 12 hours (configurable), purges history after 90 days.
- `docs/MONITORING.md`: audit, collected and unavailable metrics, CRON coverage, Supabase native monitoring, alerts, manual settings, environment variables, quotas.

## [0.14.0] — 2026-11-24

### Fixed — November 24 site audit corrections (2026-11-24)

- State of BIB: country names translated from ISO codes and common city names localized in French and Spanish (map, rankings, comparisons, home page); "Devs" labels translated.
- State of BIB: the scope line now reads "71 countries with at least one developer, out of 76 covered" instead of a bare "71 countries", which contradicted the 54 + 22 countries announced in the introduction.
- Events: Luma's English iCal boilerplate (up-to-date information link, address, hosts) is parsed and shown in every language with translated labels, instead of raw English text; the organizer's own free text keeps its original language unless a BIB translation exists.
- Tab titles no longer repeat the brand ("Events — Black in Blockchain | Black in Blockchain"); privacy, terms and cookie pages have their own title and description; the default site description no longer promises "exclusive resources".
- Unknown public URLs render a localized 404 page with the header and footer.
- Admin workflow dispatch targets `Pheniiix-Ankh-Group-Inc/BiB` by default instead of the former `akori` repository.
- The repository's State of BIB technical copy is replaced by published version `20261118T130441` (SHA-256 verified against Supabase), so local development and the fallback show real data; tests now use the archived April 2026 copy for invalid-fallback scenarios.

### Changed — single About page (2026-11-24)

- `/about` now combines the presentation, the manifesto premise, the approach, activities and the founders (`#fondateurs`); `/fondateurs` permanently redirects there. Founder profiles are unchanged.

### Added — Vercel Speed Insights (2026-11-24)

- `@vercel/speed-insights` reports real-user Core Web Vitals (LCP, INP, CLS, TTFB) per page once Speed Insights is enabled in the Vercel project. Script and data stay on the site's own domain, within the current CSP.

### Added — release process (2026-11-24)

- Add `pnpm release:prepare <x.y.z>` and the **Release** GitHub workflow: a manual run on develop moves `[Unreleased]` into a dated version section, bumps `package.json` and opens a `release: vX.Y.Z` pull request; when that version reaches `main`, the workflow creates the `vX.Y.Z` tag and the GitHub release from the changelog notes. Existing tags are never moved.
- Align `package.json` with the last recorded version (`0.13.0`) so the next release continues the existing numbering.
- Document the procedure in `docs/RELEASING.md`; update the README to the current state of the project.
- Move the misplaced historical-warehouse entry under `[Unreleased]`.

### Added — Startup Spotlight (2026-11-23)

- Public editorial page `/startup-spotlight` (FR/EN/ES), linked from the main navigation; kept out of search engines until the first portrait is published.
- Founder Story Live events are shown only when they are confirmed in the public Luma calendar.

### Changed — Premium Minimalism art direction and landing page (PR #66, 2026-11-23)

- Calmer typography, spacing and contrast across public pages; new editorial grid, event rows and founder portraits.
- Home page restructured as a landing page with anchored sections (about, activities, commitments, events, BIB in action, State of BIB teaser, newsletter, closing call to action); State of BIB keeps its own page.
- Navigation highlights the section in view; below-the-fold blocks reveal on scroll and respect reduced-motion settings.
- Published testimonials and the five most active cities appear on the home page when real data exists; unverified claims stay hidden.
- Five editorial visuals added as **provisional low-resolution previews**, to be replaced by HD exports.

### Added — State of BIB historical warehouse (2026-11-18)

- Toutes les archives disponibles importables dans Supabase via GitHub Actions, avec validation technique et contrôle d'intégrité.
- Versions historiques et écarts statistiques conservés sans réécriture des données source.
- Stockage des observations pays, villes, écosystèmes et cohortes mensuelles ; comparaison des versions dans PostgreSQL.
- Vue historique State of BIB alimentée uniquement par Supabase en production.
- Migration `20261118051801_sob_historical_deltas.sql` déjà appliquée et enregistrée sur Supabase `akori`.

### Security — private implementation for privileged Supabase RPCs (2026-11-22)

- Applied migration `20261122205510_bib_harden_definer_rpc_exposure` directly to the shared `akori` Supabase database, then mirrored its SQL in Git.
- Converted six exposed privileged RPC entrypoints to security-invoker wrappers, moved five privileged implementations to the non-exposed `private` schema, and kept existing admin/pipeline role checks.
- Verified advisor lint: 6 prior SECURITY DEFINER exposure warnings removed. Three informational RLS notices remain unchanged.
- Added regression coverage for API ACLs and RLS-based editor role lookup.


### Added — five completed institutional pages (2026-11-22)

- Replace five public placeholders with localized About, Mission, Resources,
  Press, and Contact content (FR/EN/ES) using existing BIB editorial styles.
- Route the About navigation to /about, while preserving direct access to founders.
- Provide genuine links to existing events, data, methodology and founder pages.
- Route contact topics to the **existing** mail address `contact@anbachain.org`;
  do not create a fake contact form or claim a configured messaging backend.
- Keep Membership as a placeholder; leave domains, infrastructure, legal entity
  claims and AI configuration unchanged.
- Add page and language regression tests.


### Changed — uniform public Black in Blockchain branding (2026-11-22)

- Replace legacy brand labels with **Black in Blockchain** in root page titles,
  the publisher display label, and the legal page translations (FR/EN/ES).
- Keep live `anbachain.org` DNS, `contact@anbachain.org`, Vercel project identifiers,
  and historical release records intact; these require a separate migration, if desired.
- Add a brand regression test; the actual legal entity and its registration details
  still require confirmation before the legal notices can be considered finalized.


### Fixed — reuse existing GitHub Supabase secrets without confusing PostgreSQL and REST URLs

- Map `SUPABASE_SERVICE_ROLE_KEY` to the canonical `SUPABASE_SECRET_KEY` variable in State of BIB jobs when a newer `SUPABASE_SECRET_KEY` is not available. Keep the legacy key server-only and document migration before its end-2026 deprecation.
- Resolve the REST `SUPABASE_URL` from configured secret, repository/environment variable, or the known public HTTPS endpoint for the sole BIB Supabase project. **Never pass `SUPABASE_DATABASE_URL`**, a confidential PostgreSQL DSN, to the HTTPS REST client.
- Document the separate missing `BIB_CRON_SECRET` required in GitHub to call the authenticated Vercel `CRON_SECRET` routes. A deployment cannot transfer that secret across services automatically.


### Fixed — GitHub Actions Environment scoping for BIB production

- Bind all operational jobs (Luma, State of BIB, news ingestion and newsletter) to GitHub's `production` Environment so environment-scoped vars and secrets are available.
- Resolve Supabase credentials and State of BIB enablement at the consuming job steps rather than workflow-global scope, including export and reconcile jobs.
- Move newsletter and news schedule flags from job-level `if` to a visible failing preflight step, preserving manual staging-only routing for those two editorial workflows.
- Add regression tests for job environment bindings and CI isolation.


### Fixed — production Vercel Supabase credential migration compatibility

- Accept the server-only pre-existing Vercel secret `SUPABASE_SERVICE_ROLE_KEY` as a transitional fallback when `SUPABASE_SECRET_KEY` is not yet configured, so production can read/write the single `akori` Supabase project without revealing or copying credentials. Prefer the new secret name when present and migrate it separately when validated.


### Security — explicit 30-day exception for unpatched picomatch ReDoS

- Document owner-approved, **time-limited** risk acceptance for `GHSA-fc5q-39xc-vjpf` (`CVE-2026-112366`), affecting only the current ESLint development dependency paths; no official fixed version exists as of 2026-11-17.
- Apply **only this GHSA** through pnpm v10's `auditConfig.ignoreGhsas`, retaining the production and full-Low-severity blocking audits for all other advisories.
- The CI fails closed if any additional GHSA is allowlisted, `picomatch` is introduced into the production graph, or the exception expires on **2026-12-17 UTC**. Every run visibly warns about the unresolved risk and tracks it in issue #37.
- The waiver is not a security fix and does not dismiss Dependabot alerts. Remove it immediately after upstream remediation and audited lockfile update.


### Fixed — scheduled workflows never silently skip a missing activation flag

- A real scheduled Luma run [#44196388614](https://github.com/Pheniiix-Ankh-Group-Inc/akori/actions/runs/44196388614) was skipped despite being scheduled on main; the workflow's variable condition was false.
- Luma and State of BIB now fail explicitly with an actionable error when the repository-level Actions variable `BIB_SCHEDULES_ENABLED` is missing or not exactly `true`, rather than silently skipping. Manual dispatch remains available.


### Verified — real Electric Capital dataset processing

- Full live-source DuckDB build and output validation succeeded in GitHub Actions run #44195969050 (no database credentials): six JSON files generated from source snapshot 2026-11-09; actual aggregations contain 1,556 active developers, 2,105 ecosystems, 71 countries, 684 cities, and 2,515,407 lifetime commits. End-to-end publication to Supabase is a separate pending operational step.


### Fixed — Source-derived empty aggregates and geographic identifiers

- Handle real provider rows where a country had no contributions in the last twelve months: SQL aggregates now return **zero** rather than NaN, preventing a first-build ValueError in the country map.
- Normalize provider-verified country names `Democratic Republic of the Congo`, `The Bahamas`, and `The Gambia` into the existing Africa/Caribbean country scope without inventing a region.
- Increment the State of BIB pipeline version to `2026.11.3` so prior blocked builds are retried using the corrected logic.

### Fixed — Electric Capital's current Parquet schema (live source verification)

- Correct a confirmed first-build blocker: 2026 Open Dev Data activity tables contain `canonical_developer_id`, not `developer_id`, and locations expose `locality`, not `city`.
- The provider no longer publishes `canonical_developers.first_commit_date`; derive tenure from actual earliest recorded developer activity (`MIN(day)`) instead of inventing ages or silently dropping cohorts.
- Keep legacy schema compatibility through normalized DuckDB views and add offline regression tests that reproduce the verified upstream schema.

### Fixed — automatic first-run State of BIB and Luma sync

- Trigger the Luma sync on first main release and every ten minutes, and require a verified, nonempty success response instead of relying only on HTTP status.
- Reject configured Luma iCal URLs targeting another calendar ID; fail the run if its status cannot be finalized in Supabase.
- Allow initial State of BIB ingestion to publish into Supabase even if website delivery settings are missing; fail explicitly in the website refresh step.
- Live-source diagnostics from a secrets-free GitHub runner confirmed: Luma calendar iCal returned one VEVENT dated 2026; the Electric Capital manifest returned HTTP 200, version `20261117T130335`, with all six requested parquet sources. Historical events not present in that feed cannot be reconstructed without another source.

### Security — Dependabot remediation (35 open alerts)

- Upgrade `happy-dom` to `21.0.4` and `vitest` to `5.1.0` together with regenerated pnpm lockfile; resolve compatible updated transitive `tinypool`, `@vitest/mocker`, `js-yaml`, `brace-expansion`, `nanoid`, and `postcss` versions via supported pnpm tooling.
- Replace the vulnerable transitive `minimatch@10.2.6` inside `@typescript-eslint/typescript-estree` with the published fixed `minimatch@11.0.9` using a narrowly scoped pnpm override; validate ESLint compatibility in CI.
- Keep the **unpatched** `picomatch` security finding visible. No ignore rules, no vulnerability dismissal, no artificial green audits. Revalidate the list using both production and full security audits.

### Security — full dependency audit without exclusions

- Add a blocking full npm audit at Low severity to GitHub Actions (including dev/build tooling and Moderate Dependabot alerts), preserving the existing production-only audit, so unresolved vulnerabilities cannot be hidden by limiting scope.
- Document the still-vulnerable development-only `picomatch` dependency and the upstream absence of a patched release in `docs/SECURITY.md`.

### Security — GHSA-fc5q-39xc-vjpf (CVE-2026-112366)

- Remove unused `next-intl@4.15.1 -> @parcel/watcher` from the **production** dependency graph via pnpm's targeted removal override. BIB does not use `useExtracted`. This prevents unpatched `picomatch@4.0.4` from being installed via that path.
- Configure the `next-intl/config` Turbopack alias explicitly in `next.config.ts` instead of loading the unused `next-intl/plugin` message extractor; verified Next.js 16 build is required in CI.
- Keep **both** `pnpm audit --prod --audit-level=high` and `pnpm audit --audit-level=low` as mandatory blocking CI gates; the second exposes vulnerable development dependencies, currently still awaiting an upstream fix. Do not mute or ignore the advisory.
- Revisit the override when the upstream advisory lists a patched release.

### Fixed — GitHub Actions State of BIB startup defaults

- Accept absent **or empty** optional GitHub Actions variables (`SOB_MAX_FAILED_ATTEMPTS`, `SOB_MAX_BLOCKED_ATTEMPTS`, `SOB_BLOCKED_RETRY_HOURS`, `SOB_STRONG_VARIATION`) without crashing at Python import time; keep documented safe defaults.
- Install `blake3` so explicitly enabling `SOB_VERIFY_B3=true` does not fail for a missing Python dependency.
- Add subprocess regression tests that reproduce GitHub Actions' empty optional environment variables and confirm explicit overrides.


### Fixed — single Supabase project and autonomous State of BIB

- Respect the project's **single existing Supabase `akori` database** across deployments; remove obsolete requirements to provision a second database.
- Trigger the State of BIB pipeline automatically on the first `main` push after release (when `BIB_SCHEDULES_ENABLED=true`), then hourly; no human dispatch is needed.
- Correct State of BIB revalidation for unprefixed English routes (`/`, `/state_of_bib`, `/data-sources`) and prefixed French/Spanish routes. Failed verification no longer invalidates otherwise valid public caches.
- Luma's manually triggered workflow now selects matching URL/secret pairs, with an optional Preview target. Manual news and newsletter workflows fail closed when a Preview URL is missing instead of silently targeting production.
- State of BIB dataset and AI analysis modes remain **fully automatic** (`sob=auto`, `sob_insights=auto`). The optional technical snapshot still opens a PR but never automatically merges into protected `main`.
- Add regression tests for locale-aware cache invalidation and workflow targeting. The new CI run must pass before release.
- Verify the current database has no published dataset or sync runs; automatic publication requires the updated workflow on the default branch, valid credentials and write enablement — no human approval gate.

> **Release status:** The platform architecture and pre-production corrections have been implemented and verified by offline CI. They have **not** been fully validated with live Luma, Brevo, an AI provider, production State of BIB data, or an isolated staging environment. No production release is authorized by these changes. See the [README](README.md#implementation-and-release-status) and [pre-production report](docs/audits/BIB_PREPROD_READINESS.md).

### Fixed — pre-production hardening (PR #33)

- **State of BIB cache correctness.** Publication verification now calls the `verify_current_dataset` RPC directly and rereads all six private artifacts without the Next.js `unstable_cache` layer, checking SHA-256 integrity. `revalidateTag(..., "max")` can still serve stale public content; the refresh response now explicitly distinguishes **database/Storage verification** from **unverified public visibility**.
- **State of BIB refresh responses.** The cron endpoint rejects invalid version query parameters, reports a database verification outage as HTTP 503 and an integrity/version mismatch as HTTP 409, and does not falsely claim that client-side caches have refreshed.
- **Luma false-positive success.** Removed the redundant `FEATURE_LUMA_SYNC` application flag. The cron endpoint no longer reports a skipped synchronization as successful; it returns HTTP 409 for an already-running job, a non-2xx response on processing errors, and an explicit failure for an empty iCalendar feed.
- **Luma concurrency safety.** Removed the legacy non-atomic locking fallback. When migration 0012's `begin_event_sync_run` RPC is missing, synchronization fails closed instead of risking overlapping writes.
- **Luma scheduling and staging.** Prepared `events-sync.yml` for a ten-minute schedule on the default branch, gated by `BIB_SCHEDULES_ENABLED`. Manual workflow runs use dedicated `BIB_STAGING_SITE_URL` and `BIB_STAGING_CRON_SECRET` settings and refuse an identical production/staging URL. Independent Supabase-project isolation must still be verified separately.
- **Administration.** Updated the events and automation pages to remove references to `FEATURE_LUMA_SYNC` and to describe the planned ten-minute schedule without presenting it as already active.
- **Regression coverage.** Added cases for stale-while-revalidate caching, unavailable publication verification, altered private artifacts, an empty Luma feed, and a missing atomic-lock migration.
- **Documentation.** Updated the README, deployment/automation guides, environment examples, and pre-production audit; translated the README and changelog to English while retaining their technical scope and historical records.

### Validation — latest verified CI

- [GitHub Actions run 44008551701](https://github.com/Pheniiix-Ankh-Group-Inc/akori/actions/runs/44008551701): all three jobs passed (`web`, `data`, `sql`).
- **245/245 Vitest tests** across 21 test files; **63/63 Python tests**.
- ESLint, TypeScript, Next.js production build, SQL migrations/RLS/concurrency on disposable PostgreSQL, security-header checks, and server-secret checks in the client bundle passed.
- `pnpm audit --prod --audit-level=high` reported **no known vulnerabilities**.
- No real Supabase writes, Luma sync, Brevo email delivery, AI calls, production deployment, or live E2E acceptance test was performed for these corrections.

### Added — platform architecture (PR #32)

- **Luma event synchronization.** Ingests Luma iCalendar feeds into Supabase using an RFC 5545-aware parser (time zones, all-day events, `RRULE`, `RDATE`, `EXDATE`, `RECURRENCE-ID`). Upserts are idempotent by event identity; a database-level lock prevents concurrent runs. Interrupted runs can recover, empty feeds are rejected, and significant feed-size drops do not silently remove events. Cancellations and missing events remain in history. Optional `.ics` import fills historical gaps.
- **Public event experience.** Added `/evenements` and `/evenements/[slug]` with the embedded Luma calendar, list/month views, filters, paginated history, and links to event recaps.
- **BIB in Action.** Added recaps, photo/video galleries, and testimonials with consent references at `/en-action` and `/en-action/[slug]`. Media stays private until publication and rights approval.
- **State of BIB observatory.** Added URL-shareable geographic/metric/period filters, zoomable maps and comparisons, interactive trends, sortable rankings, cohorts, keyboard/touch support, reduced-motion support, and EN/FR/ES localization.
- **State of BIB data pipeline.** Added manifest-driven source checks, detection of new versions or updated resources under the same version, independent Python/DuckDB aggregation, validations for format/coverage/duplicates/provenance, and historical versions/observations in Supabase.
- **Automated State of BIB publication.** Added `auto` mode with strengthened checks for large changes, atomic version switching, concurrency and version-order protection, verification and automatic rollback, quarantining and bounded retries, PostgreSQL/Storage/repository reconciliation, and operational incidents.
- **State of BIB server rendering.** Added integrity-checked reads of the current published version, an explicit unavailable state when no valid snapshot exists, cache invalidation after publication, and localized legal disclosures at `/data-sources`.
- **AI insights.** Added a shared configurable provider engine (`anthropic`, `openai`, `mistral`, `openai-compatible`, `mock`) with budgets and timeouts; localized State of BIB analyses per dataset version; deterministic numeric placeholders, scope/direction checks, bounded retries, and `/api/ops/ai-status`.
- **Brevo newsletter.** Added FR/EN double opt-in with consent evidence, controlled RSS/Atom source ingestion, four-section automated FR/EN drafting, deterministic validation, optional editorial review, manual or autonomous delivery, and protection against duplicate sends (status locking, idempotency keys, Brevo reconciliation).
- **Automation settings.** Added audited `auto`, `review`, and `paused` modes for State of BIB, its insights, and the newsletter.
- **Private administration.** Added `/admin` for events, recaps, media rights, testimonials, State of BIB, news sources, newsletter editions, automations, incidents, and audit history; Supabase Auth is invitation-only, with public sign-up closed.
- **Supabase schema.** Added 13 numbered migrations (0001–0013) covering permissions, auditing, events, media, datasets, newsletter, and incidents; RLS for all tables; transactional RPCs including `sync_luma_events`, `begin_event_sync_run`, `publish_dataset_candidate`, and `verify_current_dataset`; private Storage and initial-admin operational scripts.
- **Automation and monitoring.** Added `events-sync.yml`, `news-ingest.yml`, and `newsletter.yml`, with scheduling disabled until explicitly activated; structured redacted logging, execution history, incidents, and optional internal alerts.
- **Quality gates.** Added Vitest unit/security tests, Python pipeline tests, disposable-PostgreSQL SQL/RLS/concurrency tests, Playwright suites, and `ci.yml` jobs (`web`, `data`, `sql`) covering dependencies, security headers, bundle secrets, and production build.
- **Documentation.** Added architecture, data model, deployment, State of BIB automation, security, testing, operational, and editorial guides; pages-in-progress inventory; and an annotated `.env.example`.

### Changed — platform architecture (PR #32)

- **Visual system and navigation.** Replaced the previous dark homepage styling with an ivory/ink/gold editorial theme (Fraunces + Inter), accessible mobile navigation, persistent-page language switching, 44 px touch targets, AA contrast targets, and redesigned Home, About, Events, BIB in Action, and State of BIB pages.
- **Events.** Made Luma the source of truth; removed manual event creation from the administration UI and limited local editing to BIB editorial additions.
- **State of BIB.** Moved the public dataset source to Supabase. JSON files under `data/state-of-bib/` are technical copies only, eligible for fallback solely when valid and recent. Aggregation now assigns one country per developer and derives totals from the country-level dataset.
- **Data workflow.** Reworked `refresh-data.yml` from a weekly process that wrote directly to `main` into an hourly manifest check with conditional rebuilds and no direct push to `main`. Missing required configuration now fails explicitly rather than silently succeeding.
- **Pages in progress.** `/about`, `/mission`, `/membership`, `/resources`, `/press`, and `/contact` now show a shared non-indexed placeholder.
- **Authentication routes.** `/register` indicates registration is closed; `/dashboard` redirects to `/admin`.
- **Dependencies.** Upgraded to Next.js 16.4, next-intl 4.15, Zod 4.6, and supabase-js 2.119.

### Removed — platform architecture (PR #32)

- Sanity Studio/schema/client, better-auth, Stripe, `pg`, `styled-components`, the member area, and `package-lock.json` in favor of pnpm.
- Public State of BIB JSON files previously served from `public/data/`, along with public dataset downloads.
- Provider/license references outside the designated legal `/data-sources` page.
- Unsupported statistical claims and decorative sections from the previous dark-themed homepage.
- Database objects from an unrelated legacy product in the dedicated Supabase `akori` project.

### Fixed — platform architecture (PR #32)

- Restored previously broken `/login`, `/register`, and `/dashboard` routes.
- Corrected the Wednesday 09:00 Toronto newsletter time across daylight-saving and standard time.
- Made editorial records, translations, and audit changes transactional with optimistic concurrency control.
- Resolved ESLint errors and unused imports in State of BIB components.

### Security — platform architecture (PR #32)

- Removed the publicly exposed `/api/emails/welcome` route that allowed arbitrary email sending; stopped logging Brevo key prefixes.
- Added restrictive CSP based on configured Supabase origins, `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors`, HSTS, `Referrer-Policy`, and `Cross-Origin-Opener-Policy`.
- Removed external HTML insertion from State of BIB map/cohort renderers.
- Hardened subscriptions with same-origin checks, honeypots, fail-closed rate limiting, and uniform error responses.
- Added SSRF protections for news ingestion (DNS, redirects, size, content type, XML entities) and isolated untrusted content in AI prompts.
- Added binary media signature inspection and private-until-approved publication rules.
- Hardened Supabase with `SECURITY INVOKER` views, limited anonymous column privileges, `SECURITY DEFINER` functions with restricted search paths, private State of BIB Storage, and restricted anonymous dataset access.
- Reduced reported production dependency vulnerabilities from 234 to zero at the time of that audit; the later PR #33 audit also reported no known vulnerabilities.

## Earlier versions

The entries below preserve the original project changelog, including repeated version numbers and dates. They do **not** correspond to Git tags. From `0.14.0` on, every version is tagged `vX.Y.Z` and published as a GitHub release (see `docs/RELEASING.md`).

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
