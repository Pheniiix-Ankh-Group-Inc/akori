import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const workflow = (name: string) => readFileSync(join(process.cwd(), ".github", "workflows", name), "utf8")

describe("BIB automation workflow contracts", () => {
  it("preserves Vercel's server-only existing Supabase credential during rollout", () => {
    const code = readFileSync(join(process.cwd(), "src/lib/env.ts"), "utf8")
    expect(code).toContain('str("SUPABASE_SECRET_KEY") ?? str("SUPABASE_SERVICE_ROLE_KEY")')
    expect(code).not.toContain('str("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")')
  })

  it("temporary picomatch exception remains single-GHSA, expiring, and dev-only", () => {
    const workspace = readFileSync(join(process.cwd(), "pnpm-workspace.yaml"), "utf8")
    const ci = workflow("ci.yml")
    const exceptions = [...workspace.matchAll(/^\s+- (GHSA-[a-z0-9-]+)\s*$/gm)].map((m) => m[1])
    expect(exceptions).toEqual(["GHSA-fc5q-39xc-vjpf"])
    expect(ci).toContain("pnpm audit --prod --audit-level=high")
    expect(ci).toContain("pnpm audit --audit-level=low")
    expect(ci).toContain("pnpm why picomatch --prod --depth 100")
    expect(ci).toContain('expiry="2026-12-17"')
    expect(ci).toContain("::warning title=Temporary security exception")
  })

  it("Luma runs every ten minutes on main and couples manual URLs and secrets", () => {
    const y = workflow("events-sync.yml")
    expect(y).toContain('cron: "7,17,27,37,47,57 * * * *"')
    expect(y).toContain('branches: [main]')
    expect(y).toContain('report.get("ok") is not True')
    expect(y).toContain("github.ref == 'refs/heads/main'")
    expect(y).toContain('BIB_ENABLED: ${{ vars.BIB_SCHEDULES_ENABLED }}')
    expect(y).toContain('Repository Actions variable BIB_SCHEDULES_ENABLED')
    expect(y).toContain('SITE_URL="$MANUAL_SITE_URL"')
    expect(y).toContain('CRON_SECRET="$MANUAL_CRON_SECRET"')
    expect(y).toContain('SITE_URL="$PROD_SITE_URL"')
    expect(y).toContain('CRON_SECRET="$PROD_CRON_SECRET"')
  })

  it.each(["news-ingest.yml", "newsletter.yml"])("manual %s never silently targets production", (name) => {
    const y = workflow(name)
    expect(y).toContain('if [ "$TRIGGER" = "workflow_dispatch" ]')
    expect(y).toContain('SITE_URL="$MANUAL_SITE_URL"')
    expect(y).toContain('CRON_SECRET="$MANUAL_CRON_SECRET"')
    expect(y).toContain("Manual workflow requires BIB_STAGING_SITE_URL")
  })

  it("State of BIB automatically ingests and publishes without merging to main", () => {
    const y = workflow("refresh-data.yml")
    expect(y).toContain('cron: "7 * * * *"')
    expect(y).toContain("branches: [main]")
    expect(y).toContain('BIB_ENABLED: ${{ vars.BIB_SCHEDULES_ENABLED }}')
    expect(y).toContain('Repository Actions variable BIB_SCHEDULES_ENABLED')
    expect(y).toContain("python publish_supabase.py ingest")
    expect(y).toContain("python publish_supabase.py publish-pending")
    expect(y).not.toContain("gh pr merge")
    const beforeBuild = y.split("  build:")[0]
    expect(beforeBuild).not.toContain('missing="$missing BIB_SITE_URL"')
    expect(beforeBuild).not.toContain('missing="$missing BIB_CRON_SECRET"')
    expect(y).toContain("BIB_SITE_URL missing; dataset may already be published.")
  })
})
