import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/env", () => ({
  env: {
    siteUrl: "https://bib.example",
    brevo: { apiKey: "test-key", apiUrl: "https://api.brevo.test/v3", listIdFr: 11, listIdEn: 22, doiTemplateIdFr: 5, doiTemplateIdEn: 6, senderName: "BIB", senderEmail: "news@bib.example" },
  },
  isBrevoConfigured: () => true,
}))
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({}) }))

const brevo = await import("@/lib/brevo")
const { renderEdition } = await import("@/lib/newsletter/render")
const { runAllChecks, failedChecks } = await import("@/lib/newsletter/checks")

afterEach(() => vi.unstubAllGlobals())

function stubFetch(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : {} })
    return handler(url, init)
  })
  return calls
}

describe("Brevo — abonnement et campagnes (API simulée)", () => {
  it("double opt-in : confirmation demandée à Brevo, liste par langue, aucun ajout direct", async () => {
    const calls = stubFetch(() => new Response(null, { status: 204 }))
    await brevo.requestDoubleOptIn("test@example.com", "fr")
    await brevo.requestDoubleOptIn("test@example.com", "en")
    expect(calls.map((c) => c.url)).toEqual(["https://api.brevo.test/v3/contacts/doubleOptinConfirmation", "https://api.brevo.test/v3/contacts/doubleOptinConfirmation"])
    expect(calls[0].body).toMatchObject({ email: "test@example.com", includeListIds: [11], templateId: 5 })
    expect(calls[1].body).toMatchObject({ includeListIds: [22], templateId: 6 })
  })

  it("erreur Brevo : exception typée, sans corps de réponse dans le message", async () => {
    stubFetch(() => new Response(JSON.stringify({ code: "unauthorized", message: "secret detail" }), { status: 401 }))
    await expect(brevo.requestDoubleOptIn("test@example.com", "fr")).rejects.toMatchObject({ status: 401, code: "unauthorized" })
    await expect(brevo.requestDoubleOptIn("test@example.com", "fr")).rejects.not.toThrow(/secret detail/)
  })

  it("campagne : envoyée à la liste de la langue, depuis l'expéditeur configuré", async () => {
    const calls = stubFetch((url) => (url.endsWith("/emailCampaigns") ? new Response(JSON.stringify({ id: 314 }), { status: 201 }) : new Response(null, { status: 204 })))
    const id = await brevo.createCampaign({ name: "BIB newsletter 2027-01-04 FR", subject: "Objet", htmlContent: "<p>x</p>", listId: brevo.listIdFor("fr"), tag: "t" })
    expect(id).toBe(314)
    expect(JSON.stringify(calls[0].body)).toContain("11")
    expect(JSON.stringify(calls[0].body)).toContain("news@bib.example")
    await brevo.sendCampaignNow(314)
    expect(calls[1].url).toBe("https://api.brevo.test/v3/emailCampaigns/314/sendNow")
  })
})

const inputs = {
  facts: [{ key: "devs_active_28d", value: 4200, label: { fr: "développeurs actifs (28 jours)", en: "active developers (28 days)" } }],
  sob: { versionId: "v", asOf: "2026-11-01", source: "Source de test", license: "Licence de test" },
  news: [{ id: "n1", title: "Projet pilote à Accra", summary: null, url: "https://news.example.com/a", sourceName: "Exemple Média", sourceTerms: "ok", publishedAt: null, theme: "payments", regions: ["africa"] }],
  events: [{ id: "e1", slug: "meetup", startsAt: "2027-01-20T23:00:00Z", timeZone: "America/Toronto", city: "Toronto", mode: "in_person", lumaUrl: "https://lu.ma/meetup", title: { fr: "Rencontre BIB", en: "BIB meetup" }, url: { fr: "https://bib.example/fr/evenements/meetup", en: "https://bib.example/evenements/meetup" } }],
  stories: [{ id: "s1", slug: "retour", publishedAt: "2026-12-20T00:00:00Z", title: { fr: "Retour sur l'atelier", en: "Workshop recap" }, summary: { fr: null, en: null }, url: { fr: "https://bib.example/fr/en-action/retour", en: "https://bib.example/en-action/retour" } }],
} as never

const locale = (fr: boolean) => ({
  subject: fr ? "Les nouvelles de la semaine" : "This week's news",
  preheader: "",
  intro: fr ? "Bonjour à toutes et à tous, voici les nouvelles de la communauté pour cette semaine." : "Hello everyone, here is the community news for this week.",
  blockchain_insights: { text: fr ? "La communauté compte {{fact:devs_active_28d}} et poursuit ses projets." : "The community has {{fact:devs_active_28d}} and continues its projects." },
  blockchain_news: [{ news_id: "n1", blurb: fr ? "Une initiative locale pour les commerçants de la région." : "A local initiative for merchants in the region." }],
  bib_events: [{ event_id: "e1", blurb: fr ? "Une soirée d'échange ouverte à toutes et à tous." : "An evening of exchange open to everyone." }],
  bib_highlights: [{ story_id: "s1", blurb: fr ? "Les moments forts de l'atelier en images." : "Highlights of the workshop in pictures." }],
})

describe("e-mail rendu : rubriques, sources, désabonnement", () => {
  it.each([["fr", true], ["en", false]] as const)("%s : quatre rubriques, source de l'article citée, lien de désabonnement", (l, fr) => {
    const { html, links } = renderEdition(locale(fr) as never, inputs, l)
    for (const rubric of ["Blockchain Insights", "Blockchain News", "BIB Events", "BIB Highlights"]) expect(html).toContain(rubric)
    // Les actualités restent sourcées dans l'e-mail (titre, média, lien d'origine).
    expect(html).toContain("Exemple Média")
    expect(links).toContain("https://news.example.com/a")
    expect(links).toContain("https://lu.ma/meetup")
    expect(html).toContain("{{ unsubscribe }}")
    // Le chiffre vient du marqueur, pas du texte libre.
    expect(html).not.toContain("{{fact:")
  })

  it("paire FR/EN cohérente : contrôles éditoriaux sans échec bloquant", () => {
    const checks = runAllChecks({ fr: locale(true), en: locale(false) } as never, inputs, "2027-01-06T14:00:00.000Z")
    expect(failedChecks([...checks.fr, ...checks.en, ...checks.pair]).map((c) => c.key)).toEqual([])
  })

  it("contrôles : chiffre libre, élément inconnu et parité FR/EN rompue sont bloquants", () => {
    const fr = locale(true)
    const en = locale(false)
    const free = runAllChecks({ fr: { ...fr, intro: "Bonjour, nous sommes 500 cette semaine dans la communauté et les projets." }, en } as never, inputs, "2027-01-06T14:00:00.000Z")
    expect(failedChecks([...free.fr, ...free.en, ...free.pair]).length).toBeGreaterThan(0)
    const unknown = runAllChecks({ fr: { ...fr, blockchain_news: [{ news_id: "inconnu", blurb: fr.blockchain_news[0].blurb }] }, en } as never, inputs, "2027-01-06T14:00:00.000Z")
    expect(failedChecks([...unknown.fr, ...unknown.en, ...unknown.pair]).length).toBeGreaterThan(0)
    const parity = runAllChecks({ fr, en: { ...en, bib_events: [] } } as never, inputs, "2027-01-06T14:00:00.000Z")
    expect(failedChecks([...parity.fr, ...parity.en, ...parity.pair]).length).toBeGreaterThan(0)
  })
})
