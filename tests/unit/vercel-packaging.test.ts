import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => readFileSync(join(root, file), "utf8")

describe("Vercel packaging: GitHub-only docs and database SQL", () => {
  it("excludes docs/ and supabase/ from Vercel uploads without ignoring them in Git", () => {
    const lines = read(".vercelignore")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"))
    expect(lines).toEqual(["docs/", "supabase/"])
    const gitignore = read(".gitignore")
    expect(gitignore).not.toMatch(/^\/?docs\/?$/m)
    expect(gitignore).not.toMatch(/^\/?supabase\/?$/m)
  })

  it("also excludes both source-only folders from all Next.js server traces", () => {
    const config = read("next.config.ts")
    expect(config).toContain("outputFileTracingExcludes")
    expect(config).toContain('"/*": ["./docs/**/*", "./supabase/**/*"]')
    expect(config).toContain('"next-server": ["./docs/**/*", "./supabase/**/*"]')
    // Do not break State of BIB's local fallback or the map's static data.
    expect(read(".vercelignore")).not.toMatch(/^data\//m)
    expect(read(".vercelignore")).not.toMatch(/^public\//m)
    expect(read(".vercelignore")).not.toMatch(/^src\//m)
  })

  it("retains real SQL migration checks in GitHub CI, independent of Vercel", () => {
    const ci = read(".github/workflows/ci.yml")
    expect(ci).toContain("bash supabase/tests/run.sh")
    expect(ci).toContain('glob.glob("supabase/migrations/*.sql")')
    expect(read("package.json")).toContain("bash supabase/tests/run.sh")
    expect(read("docs/DEPLOYMENT.md")).toContain("dossiers conservés dans GitHub")
  })
})
