import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// GHSA-fc5q-39xc-vjpf / CVE-2026-112366.
// BIB does not use the next-intl useExtracted message extractor.
describe("dependency supply chain", () => {
  it("keeps both production and full dependency audits blocking in CI", () => {
    const ci = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8")
    expect(ci).toContain("run: pnpm audit --prod --audit-level=high")
    expect(ci).toContain("run: pnpm audit --audit-level=low")
    expect(ci).not.toContain("continue-on-error: true")
    expect(ci).not.toContain("--ignore")
  })
  it("pins patched Happy DOM and Vitest major versions", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"))
    expect(pkg.devDependencies["happy-dom"]).toBe("21.0.4")
    expect(pkg.devDependencies.vitest).toBe("5.1.0")
  })
  it("removes the unused next-intl watcher instead of ignoring the advisory", () => {
    const root = process.cwd()
    const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8")
    const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8")
    expect(workspace).toContain('"next-intl@4.15.1>@parcel/watcher": "-"')
    expect(workspace).toContain('"@typescript-eslint/typescript-estree>minimatch": "^11.0.1"')
    expect(lock).toContain("minimatch@11.0.9:")
    expect(lock).not.toContain("minimatch@10.2.6:")
    // pnpm regenerates lockfile overrides as unquoted YAML keys.
    expect(lock).toContain("next-intl@4.15.1>@parcel/watcher: '-'")
    const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8")
    expect(nextConfig).not.toContain('from "next-intl/plugin"')
    expect(nextConfig).toContain('"next-intl/config": "./src/i18n/request.ts"')
    expect(lock).not.toContain("      '@parcel/watcher': 2.5.6")
    expect(lock).not.toMatch(/^  '@parcel\/watcher(?:-[^']+)?@/m)
  })
})
