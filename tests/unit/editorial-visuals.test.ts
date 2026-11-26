import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { VISUALS, isDisplayable, visual, type Visual } from "@/lib/editorial/visuals"

const messages = (locale: string) => JSON.parse(readFileSync(join(process.cwd(), `src/messages/${locale}.json`), "utf8"))

describe("editorial visuals (Premium Minimalism)", () => {
  it.each(Object.entries(VISUALS))("%s points to existing public files", (_key, v) => {
    for (const f of [v.desktop, v.mobile]) {
      if (!f) continue
      expect(f.src).toMatch(/^\/images\/editorial\/[a-z0-9-]+\.(jpe?g|webp|avif)$/)
      expect(existsSync(join(process.cwd(), "public", f.src))).toBe(true)
    }
  })

  it.each(Object.entries(VISUALS))("%s documents its source and licence", (_key, v) => {
    expect(v.placement.length).toBeGreaterThan(5)
    expect(v.role.length).toBeGreaterThan(5)
    expect(v.source.provider.length).toBeGreaterThan(2)
    expect(v.source.reference.length).toBeGreaterThan(2)
    expect(v.source.license.length).toBeGreaterThan(10)
  })

  it("labels AI visuals shown near events as mood visuals", () => {
    expect(VISUALS.events.ambient).toBe(true)
    expect(VISUALS.closing.ambient).toBe(true)
  })

  it("never upscales: low-resolution or unvalidated files are not displayed", () => {
    const base: Visual = { ...VISUALS.home, status: "validated", desktop: { src: "/x.jpg", width: 2560, height: 1097 }, mobile: null }
    expect(isDisplayable(base)).toBe(true)
    expect(isDisplayable({ ...base, desktop: { src: "/x.jpg", width: 200, height: 100 } })).toBe(false)
    expect(isDisplayable({ ...base, status: "provisional" })).toBe(false)
    expect(isDisplayable({ ...base, mobile: { src: "/m.jpg", width: 400, height: 500 } })).toBe(false)
    expect(isDisplayable({ ...base, mobile: { src: "/m.jpg", width: 1200, height: 1500 } })).toBe(true)
    // Un visuel affiché est toujours assez défini pour son emplacement.
    for (const key of Object.keys(VISUALS) as (keyof typeof VISUALS)[]) {
      const v = visual(key)
      if (v) expect(v.desktop.width).toBeGreaterThanOrEqual(v.minWidth)
    }
  })

  it.each(["fr", "en", "es"])("has an alternative text for every visual in %s", (locale) => {
    const alts = messages(locale).Visuals as Record<string, string>
    for (const v of Object.values(VISUALS)) {
      if (v.alt === null) continue
      expect(alts[v.alt]?.trim().length ?? 0).toBeGreaterThan(10)
    }
    expect(alts.ambientCaption?.trim().length ?? 0).toBeGreaterThan(10)
  })

  it("keeps the derived light gold for ink backgrounds only", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")
    expect(css).toContain("--accent-light: #C9A45C")
    const uses = css.split("\n").filter((l) => l.includes("var(--accent-light)"))
    expect(uses.length).toBeGreaterThan(0)
    // Contextes sur encre : bandeau State of BIB, bouton inversé, pied de page, chapitres im-ink et en-têtes ph-ink.
    for (const line of uses) expect(line).toMatch(/ed-section-ink|ed-btn-line-inv|ed-footer|im-ink|ph-ink|ph-cine/)
  })
})
