import { beforeEach, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  ANALYTICS_EVENTS,
  outboundHost,
  resetAnalyticsDedupe,
  sanitizeProps,
  scrubUrl,
  setAnalyticsSender,
  trackEvent,
} from "@/lib/analytics"

const sent: { name: string; props: Record<string, unknown> }[] = []

beforeEach(() => {
  sent.length = 0
  resetAnalyticsDedupe()
  setAnalyticsSender((name, props) => sent.push({ name, props }))
})

describe("événements analytics métier", () => {
  it("n'émet que les événements de la liste fermée", () => {
    expect(trackEvent("state_of_bib_view", { version: "20261124T130735" })).toBe(true)
    // @ts-expect-error nom hors liste
    expect(trackEvent("page_secret", {})).toBe(false)
    expect(sent.map((s) => s.name)).toEqual(["state_of_bib_view"])
  })

  it("ne déclenche un événement de consultation qu'une fois par page (pas de doublon)", () => {
    for (let i = 0; i < 3; i++) trackEvent("article_view", { slug: "ed-2" }, { once: "article_view:/fr/en-action/ed-2" })
    trackEvent("article_view", { slug: "ed-3" }, { once: "article_view:/fr/en-action/ed-3" })
    expect(sent).toHaveLength(2)
  })

  it("limite les clics sortants identiques à un par seconde", () => {
    trackEvent("outbound_click", { host: "luma.com" }, { key: "outbound:luma.com", throttleMs: 1000 })
    trackEvent("outbound_click", { host: "luma.com" }, { key: "outbound:luma.com", throttleMs: 1000 })
    trackEvent("outbound_click", { host: "linkedin.com" }, { key: "outbound:linkedin.com", throttleMs: 1000 })
    expect(sent.map((s) => s.props.host)).toEqual(["luma.com", "linkedin.com"])
  })

  it("ne transmet jamais d'e-mail, de jeton, de clé sensible ni plus de 2 propriétés", () => {
    expect(sanitizeProps({ email: "a@b.co", reason: "rate" })).toEqual({ reason: "rate" })
    expect(sanitizeProps({ reason: "contact a@b.co" })).toEqual({})
    expect(sanitizeProps({ reason: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" })).toEqual({})
    expect(sanitizeProps({ token: "x", user_id: "u1", password: "p", ip: "1.2.3.4" })).toEqual({})
    expect(sanitizeProps({ host: "https://x.y/?t=1" })).toEqual({})
    expect(Object.keys(sanitizeProps({ a: 1, b: 2, c: 3 }))).toHaveLength(2)
    expect(sanitizeProps({ slug: "black-in-blockchain-anbachain-ed-2-fbdb5e" })).toEqual({ slug: "black-in-blockchain-anbachain-ed-2-fbdb5e" })
  })

  it("assainit les URL de pages vues : ni paramètres ni fragment, sauf newsletter=confirmed", () => {
    expect(scrubUrl("https://www.anbachain.org/auth/callback?code=abc&token_hash=zzz#x")).toBe("https://www.anbachain.org/auth/callback")
    expect(scrubUrl("https://www.anbachain.org/fr?newsletter=confirmed&utm=a")).toBe("https://www.anbachain.org/fr?newsletter=confirmed")
    expect(scrubUrl("https://www.anbachain.org/fr?newsletter=a@b.co")).toBe("https://www.anbachain.org/fr")
  })

  it("repère les liens sortants par nom d'hôte seulement", () => {
    expect(outboundHost("https://www.linkedin.com/in/x?trk=1", "https://www.anbachain.org")).toBe("linkedin.com")
    expect(outboundHost("/fr/evenements", "https://www.anbachain.org")).toBeNull()
    expect(outboundHost("mailto:hello@x.org", "https://www.anbachain.org")).toBeNull()
  })

  it("chaque événement déclaré est réellement émis quelque part dans le code", () => {
    const files = [
      "src/components/analytics/SiteAnalytics.tsx",
      "src/components/newsletter/NewsletterForm.tsx",
      "src/app/[locale]/(public)/en-action/[slug]/page.tsx",
      "src/components/analytics/TrackView.tsx",
      "src/app/[locale]/(public)/state_of_bib/page.tsx",
      "src/app/(operateurs)/admin/page.tsx",
      "src/app/(operateurs)/login/actions.ts",
      "src/app/auth/callback/route.ts",
    ].map((f) => readFileSync(f, "utf8")).join("\n")
    for (const e of ANALYTICS_EVENTS) expect(files, e).toContain(`"${e}"`)
  })

  it("aucun appel direct à track() en dehors des modules analytics", () => {
    const raw = readFileSync("src/components/newsletter/NewsletterForm.tsx", "utf8")
    expect(raw).not.toMatch(/from "@vercel\/analytics"/)
  })
})
