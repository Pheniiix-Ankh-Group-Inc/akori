import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const names = ["about", "mission", "resources", "press", "contact"] as const

describe("BIB institutional pages", () => {
  it.each(names)("replaces the %s placeholder with localized content", (key) => {
    const page = read("src/app/[locale]/(public)/" + key + "/page.tsx")
    expect(page).not.toContain("PlaceholderPage")
    expect(page).toContain('namespace: "Institutional.' + key + '"')
    expect(page).toContain("generateMetadata")
  })

  it("keeps Membership deliberately unlaunched", () => {
    expect(read("src/app/[locale]/(public)/membership/page.tsx")).toContain("PlaceholderPage")
  })

  it("links public About navigation to the finished page", () => {
    expect(read("src/components/sections/Header.tsx")).toContain('{ key: "about", href: "/about" }')
    expect(read("src/components/sections/Footer.tsx")).toContain('<Link href="/about">')
  })

  it("keeps the contact domain and avoids a nonfunctional form", () => {
    const contact = read("src/app/[locale]/(public)/contact/page.tsx")
    expect(contact).toContain("mailto:contact@anbachain.org")
    expect(contact).not.toContain("<form")
  })

  it("keeps identical translation keys across FR/EN/ES", () => {
    const messages = ["fr", "en", "es"].map((l) => JSON.parse(read("src/messages/" + l + ".json")).Institutional)
    expect(Object.keys(messages[0]).sort()).toEqual(Object.keys(messages[1]).sort())
    expect(Object.keys(messages[1]).sort()).toEqual(Object.keys(messages[2]).sort())
    for (const key of names) {
      expect(Object.keys(messages[0][key]).sort()).toEqual(Object.keys(messages[1][key]).sort())
      expect(Object.keys(messages[1][key]).sort()).toEqual(Object.keys(messages[2][key]).sort())
    }
  })
})
