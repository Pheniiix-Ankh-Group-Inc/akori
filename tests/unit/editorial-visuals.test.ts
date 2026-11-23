import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { VISUALS } from "@/lib/editorial/visuals"

const messages = (locale: string) => JSON.parse(readFileSync(join(process.cwd(), `src/messages/${locale}.json`), "utf8"))

describe("editorial visuals (Premium Minimalism)", () => {
  it.each(Object.entries(VISUALS))("%s points to an existing public file once enabled", (_key, v) => {
    if (v.file === null) return
    expect(v.file).toMatch(/^\/images\/editorial\/[a-z0-9-]+\.(jpe?g|webp|avif)$/)
    expect(existsSync(join(process.cwd(), "public", v.file))).toBe(true)
  })

  it.each(["fr", "en", "es"])("has an alternative text for every visual in %s", (locale) => {
    const alts = messages(locale).Visuals as Record<string, string>
    for (const v of Object.values(VISUALS)) {
      expect(alts[v.alt]?.trim().length ?? 0).toBeGreaterThan(10)
    }
  })

  it("keeps the derived light gold for ink backgrounds only", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")
    expect(css).toContain("--accent-light: #C9A45C")
    const uses = css.split("\n").filter((l) => l.includes("var(--accent-light)"))
    expect(uses.length).toBeGreaterThan(0)
    for (const line of uses) expect(line).toMatch(/ed-section-ink|ed-btn-line-inv/)
  })
})
