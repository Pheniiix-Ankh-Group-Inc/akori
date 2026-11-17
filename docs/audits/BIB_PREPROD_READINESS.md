# Black in Blockchain — corrective audit and release reality

> Updated for the owner's confirmed decisions: a **single existing Supabase database** and **fully autonomous State of BIB**, with the Luma calendar ID and links confirmed by the owner. Historical assumptions about creating an independent staging database are superseded by this decision.

## Confirmed state (read-only inspection, November 16–17, 2026)

- Supabase `akori` (`zwfyuhgnbdrjhetkyanj`), PostgreSQL 17, active.
- Thirteen migrations through `sob_full_auto` are applied.
- Automation settings: `sob=auto`, `sob_insights=auto`, `newsletter=review`.
- Database currently contains **0 events, 0 event_sync_runs, 0 dataset_versions, 0 ingestion_runs, 0 active administrators**.
- The Open Dev Data manifest is available and advertises a source snapshot dated November 16, 2026.
- The previous CI on the correction branch passed; a fresh CI run is required for the changes in this branch.
- Current `main` still has the legacy weekly State of BIB workflow. GitHub schedules on `develop` do not run automatically until the updated workflow is released on `main`.
- Vercel project configuration and all secret values are not yet independently verified from the available connection.

## Code corrections

| Risk | Correction | Verification |
| --- | --- | --- |
| Default English pages not revalidated | Invalidate `/`, `/state_of_bib`, `/data-sources`, as well as FR/ES paths | Vitest regression |
| Verification failure evicting valid public caches | Invalidate only after direct RPC + SHA-256 verification succeeds | Vitest regression |
| Manual Luma required a second environment URL despite a single DB | Select a consistent Preview URL/secret pair if available; otherwise canonical URL/secret | Workflow contract test |
| Manual news/newsletter could call the production site | Require explicit Preview URL/secret for manual dispatch | Workflow contract test |
| Repository snapshot job could auto-merge into main | Open a technical PR only; Supabase publication remains fully automated | Workflow contract test |
| Documentation incorrectly required two databases | Document shared `akori` and the resulting non-destructive testing restrictions | Documentation review |

## Enable State of BIB from the first production release

1. Release the updated `refresh-data.yml` workflow to GitHub's default branch `main` through the normal reviewed release PR; replace the legacy weekly workflow. A push to `main` triggers initial ingestion immediately when the automation gate is enabled, then hourly checks continue.
2. GitHub Actions repository variable: `BIB_SCHEDULES_ENABLED=true`. This enables the scheduling layer, **not** a human approval gate.
3. GitHub Actions variable: `SOB_SUPABASE_SYNC=true`. Point `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (secrets) to the existing **akori** project only.
4. Set GitHub variable `BIB_SITE_URL` to the deployed HTTPS site, and secret `BIB_CRON_SECRET` equal to its Vercel Production `CRON_SECRET` (at least 32 random characters).
5. Configure Vercel Production `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `FEATURE_SOB_READ_FROM_SUPABASE=true` for **akori**.
6. On launch, the pipeline checks hourly, builds on a new source version, applies deterministic/reinforced validation, publishes in `sob=auto`, verifies the PostgreSQL pointer and private Storage hashes, invalidates the website cache, and attempts `sob_insights=auto` when the AI provider is configured. No human approval is needed.
7. For AI insights, configure a real `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `FEATURE_AI=true`, and spend limits. Never publish mock/simulated analyses in production.
8. Run an initial controlled pipeline execution after confirming project and credentials. Actual source files can be large: budget GitHub runner memory/time, network and Supabase storage before launch.

The `data/state-of-bib/` copy is operational backup metadata only. The pipeline's optional `repo-sync` PR does **not** gate publication to the website and does not auto-merge code.

## Luma and admin

- Calendar ID: `cal-aqEzCpUP5LXSBcL`; confirmed iCal URL: `https://api.lu.ma/ics/get?entity=calendar&id=cal-aqEzCpUP5LXSBcL`. The application now uses this as the verified fallback for the known calendar. This does not imply a successful first live database synchronization.
- Configure the verified `LUMA_ICAL_URL` in Vercel and the shared cron secret. Once the updated Luma workflow is on `main`, its schedule runs every ten minutes if `BIB_SCHEDULES_ENABLED=true`.
- No active BIB administrator currently exists. Invite the approved address and run the reviewed first-admin bootstrap, then validate permissions and UI.
- A single Supabase project means Preview cron/write tests affect real BIB data. Do not run destructive test scenarios.

## Security and remaining release prerequisites

Supabase security advisors currently show informational RLS-policy omissions on private service-only tables and warnings about six authenticated-executable SECURITY DEFINER functions. Review their in-function role checks, intended `GRANT EXECUTE` exposure and RLS policies before altering an applied schema. Do not blindly revoke the admin's valid RPC access.

To declare real-world operation, verify GitHub/Vercel credentials, the Luma first sync, source pipeline completion/public visibility, admin bootstrap, Brevo DOI/authorized test recipient delivery, media permissions, and actual provider AI calls. CI alone cannot prove these integrations. No remote schema/data writes or production deployments were executed by this branch.

**Current status: code corrections implemented; GitHub CI and live integrations are still required for production acceptance.**
