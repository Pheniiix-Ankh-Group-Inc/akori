import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const workflow = (name: string) => readFileSync(join(process.cwd(), ".github", "workflows", name), "utf8")

describe("BIB automation workflow contracts", () => {
  it("Luma runs every ten minutes on main and couples manual URLs and secrets", () => {
    const y = workflow("events-sync.yml")
    expect(y).toContain('cron: "7,17,27,37,47,57 * * * *"')
    expect(y).toContain("github.ref == 'refs/heads/main'")
    expect(y).toContain("BIB_SCHEDULES_ENABLED == 'true'")
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
    expect(y).toContain("BIB_SCHEDULES_ENABLED == 'true'")
    expect(y).toContain("python publish_supabase.py ingest")
    expect(y).toContain("python publish_supabase.py publish-pending")
    expect(y).not.toContain("gh pr merge")
  })
})
