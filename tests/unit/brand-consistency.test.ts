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

  it.each(["fr", "en", "es"])("uses the public brand in %s legal metadata", (locale) => {
    const messages = JSON.parse(read(`src/messages/${locale}.json`))
    expect(messages.terms.metadata.title).toContain("Black in Blockchain")
  })
})
