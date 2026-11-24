import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const visibleBrandFiles = [
  "src/app/layout.tsx",
  "src/app/[locale]/(public)/terms/page.tsx",
  "src/messages/fr.json",
  "src/messages/en.json",
  "src/messages/es.json",
]

describe("Black in Blockchain public brand consistency", () => {
  it.each(visibleBrandFiles)("%s has no legacy display brand", (path) => {
    // Current .org domain and mailbox remain active technical addresses.
    const text = read(path).replace(/anbachain\.org/gi, "")
    expect(text).not.toMatch(/\banbachain\b/i)
  })

  it("uses the public brand in page title metadata", () => {
    expect(read("src/app/layout.tsx")).toContain('template: "%s | Black in Blockchain"')
  })

  it.each(["fr", "en", "es"])("never repeats the brand added by the title template (%s)", (locale) => {
    // « X — Black in Blockchain » + le gabarit « %s | Black in Blockchain »
    // donnerait « X — Black in Blockchain | Black in Blockchain ».
    const raw = read(`src/messages/${locale}.json`)
    expect(raw).not.toMatch(/"(title|metaTitle)": "[^"]+ — Black in Blockchain"/)
    const messages = JSON.parse(raw)
    for (const ns of ["terms", "privacy", "cookies"]) expect(messages[ns].metadata.title.length).toBeGreaterThan(3)
  })
})
