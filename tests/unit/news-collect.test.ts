import { describe, expect, it, vi } from "vitest"
import { FakeDb } from "./helpers/fake-supabase"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => { throw new Error("client réel interdit en test") } }))

const { ingestNews, parseFeed, classify } = await import("@/lib/news/ingest")
const { probeFeed, sourceSchema } = await import("@/lib/news/sources")

// Flux fictifs (domaines réservés aux exemples) : aucune source réelle.
const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Exemple</title>
<item><title>Nigeria: stablecoin payment pilot for merchants</title><link>https://news.example.com/a?utm_source=x</link><description>&lt;p&gt;A remittance and payment pilot in Lagos.&lt;/p&gt;</description><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>Nigeria: stablecoin payment pilot for merchants</title><link>https://news.example.com/a</link><description>Duplicate with tracking removed.</description></item>
<item><title>Price prediction: this memecoin will pump</title><link>https://news.example.com/b</link><description>To the moon.</description></item>
<item><title>Kenya hackathon gathers the developer community</title><link>https://news.example.com/c</link><description>A community meetup and hackathon in Nairobi.</description><pubDate>Tue, 10 Nov 2026 08:00:00 GMT</pubDate></item>
<item><title>Internal link</title><link>http://127.0.0.1/admin</link><description>regulation law</description></item>
</channel></rss>`
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Exemple Atom</title>
<entry><title>Jamaïque : nouvelle réglementation des actifs numériques</title><link rel="alternate" href="https://actus.example.org/reglementation"/><summary>La banque centrale précise sa politique.</summary><updated>2026-11-11T12:00:00Z</updated></entry>
<entry><title>Kenya hackathon gathers the developer community</title><link href="https://actus.example.org/reprise"/><summary>Same story on another site.</summary></entry>
</feed>`

function setup() {
  const db = new FakeDb()
  db.unique.news_items = ["fingerprint"]
  db.table("news_sources").push(
    { id: "s1", name: "Exemple RSS", feed_url: "https://news.example.com/feed", language: "en", region_tags: ["africa"], enabled: true, authorized_at: "2026-11-01T00:00:00Z" },
    { id: "s2", name: "Exemple Atom", feed_url: "https://actus.example.org/atom", language: "fr", region_tags: ["caribbean"], enabled: true, authorized_at: "2026-11-01T00:00:00Z" },
    { id: "s3", name: "En panne", feed_url: "https://down.example.net/feed", language: "en", region_tags: [], enabled: true, authorized_at: "2026-11-01T00:00:00Z" },
    { id: "s4", name: "Non autorisée", feed_url: "https://off.example.net/feed", language: "en", region_tags: [], enabled: false, authorized_at: null },
  )
  const fetched: string[] = []
  const fetchText = (async (url: string) => {
    fetched.push(url)
    if (url.includes("down.")) throw new Error("http_503")
    return { text: url.includes("actus") ? ATOM : RSS, contentType: url.includes("actus") ? "application/atom+xml" : "application/rss+xml", finalUrl: url }
  }) as never
  return { db, fetched, fetchText }
}

describe("collecte des actualités (flux simulés)", () => {
  it("lit RSS et Atom, uniquement les sources activées et autorisées", async () => {
    const { db, fetched, fetchText } = setup()
    const r = await ingestNews({ admin: db as never, fetchText })
    expect(fetched.sort()).toEqual(["https://actus.example.org/atom", "https://down.example.net/feed", "https://news.example.com/feed"])
    expect(r.sources).toBe(3)
    const titles = db.table("news_items").map((n) => n.title)
    expect(titles).toContain("Nigeria: stablecoin payment pilot for merchants")
    expect(titles).toContain("Jamaïque : nouvelle réglementation des actifs numériques")
  })

  it("déduplique (URL canonique sans paramètres de suivi, puis même titre sur un même domaine)", async () => {
    const { db, fetchText } = setup()
    await ingestNews({ admin: db as never, fetchText })
    const items = db.table("news_items")
    expect(items.filter((n) => String(n.title).startsWith("Nigeria")).length).toBe(1)
    expect(items.find((n) => String(n.title).startsWith("Nigeria"))!.canonical_url).toBe("https://news.example.com/a")
    // Une seconde collecte n'ajoute rien.
    const again = await ingestNews({ admin: db as never, fetchText })
    expect(again.inserted).toBe(0)
    expect(db.table("news_items").length).toBe(items.length)
  })

  it("écarte la spéculation et les liens non publics ; conserve la provenance", async () => {
    const { db, fetchText } = setup()
    await ingestNews({ admin: db as never, fetchText })
    const items = db.table("news_items")
    expect(items.some((n) => /memecoin|Internal/.test(String(n.title)))).toBe(false)
    const ng = items.find((n) => String(n.title).startsWith("Nigeria"))!
    expect(ng).toMatchObject({ source_id: "s1", theme: "payments", language: "en" })
    expect(ng.region_tags).toEqual(expect.arrayContaining(["africa"]))
    expect(String(ng.summary).length).toBeLessThanOrEqual(600)
    expect(String(ng.summary)).not.toMatch(/<p>/)
  })

  it("source en erreur : échec journalisé sur la source, les autres continuent", async () => {
    const { db, fetchText } = setup()
    const r = await ingestNews({ admin: db as never, fetchText })
    expect(r.failures).toEqual([{ source: "En panne", reason: "http_503" }])
    expect(db.table("news_sources").find((s) => s.id === "s3")!.last_status).toBe("error: http_503")
    expect(db.table("news_sources").find((s) => s.id === "s1")!.last_status).toBe("ok")
  })

  it("thèmes éditoriaux : paiements, infrastructure, communauté, réglementation", () => {
    expect(classify("Cross-border payment and remittance with stablecoin").theme).toBe("payments")
    expect(classify("New validator infrastructure and data center in Accra").theme).toBe("infrastructure")
    expect(classify("A grassroots community meetup and hackathon").theme).toBe("community")
    expect(classify("La banque centrale publie une nouvelle réglementation").theme).toBe("regulation")
    expect(classify("Accra and Kingston, Jamaica").regions.sort()).toEqual(["africa", "caribbean"])
    expect(parseFeed(ATOM)).toHaveLength(2)
  })
})

describe("enregistrement d'une source", () => {
  it("un flux est lu et contrôlé avant d'être accepté", async () => {
    const ok = await probeFeed("https://news.example.com/feed", async () => parseFeed(RSS))
    expect(ok).toMatchObject({ ok: true, items: 5, latest: "2026-11-10T08:00:00.000Z" })
    expect(ok.sample).toHaveLength(3)
  })

  it("flux vide, illisible ou adresse interne : refusé", async () => {
    expect((await probeFeed("https://news.example.com/feed", async () => [])).ok).toBe(false)
    expect((await probeFeed("https://news.example.com/feed", async () => { throw new Error("content_type_not_feed") })).error).toMatch(/illisible/)
    const internal = await probeFeed("http://localhost/feed", async () => parseFeed(RSS))
    expect(internal.ok).toBe(false)
  })

  it("conditions de réutilisation obligatoires, HTTPS exigé", () => {
    const base = { name: "Exemple", feed_url: "https://news.example.com/feed", homepage_url: "", kind: "rss", language: "en", region_tags: ["africa"], usage_terms: "Flux public ; titre, court résumé et lien avec mention de la source." }
    expect(sourceSchema.safeParse(base).success).toBe(true)
    expect(sourceSchema.safeParse({ ...base, usage_terms: "ok" }).success).toBe(false)
    expect(sourceSchema.safeParse({ ...base, feed_url: "http://news.example.com/feed" }).success).toBe(false)
  })
})
