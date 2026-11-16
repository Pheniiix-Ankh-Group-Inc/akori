import { describe, expect, it } from "vitest"
import { canonicalUrl, classify, parseFeed, titleFingerprint } from "@/lib/news/ingest"
import { extractJson, AiOutputError } from "@/lib/ai/engine"
import { FINANCIAL_ADVICE_PATTERNS } from "@/lib/newsletter/checks"
import { redact, redactString } from "@/lib/ops/log"
import { eventTiming } from "@/lib/events/temporal"
import { normalizeLumaUrl } from "@/lib/luma"

describe("veille : normalisation et déduplication", () => {
  it("canonicalise les URL (traceurs, www, fragment, https)", () => {
    expect(canonicalUrl("http://www.Example.org/a/?utm_source=x&id=2#top")).toBe("https://example.org/a/?id=2")
    expect(canonicalUrl("javascript:alert(1)")).toBeNull()
    expect(canonicalUrl("ftp://example.org/x")).toBeNull()
  })
  it("même titre et même site → même empreinte", () => {
    expect(titleFingerprint("Lagos Fintech Week!", "https://example.org/a")).toBe(titleFingerprint("lagos fintech week", "https://www.example.org/b"))
  })
  it("classe sans déduire de diaspora à partir d'un nom", () => {
    expect(classify("Kenya central bank publishes stablecoin regulation").regions).toContain("africa")
    expect(classify("Interview with Chinedu Okafor about rollups").regions).toEqual([])
    expect(classify("Memecoin to the moon price prediction").excluded).toBe(true)
  })
  it("parse un flux RSS sans exécuter le contenu injecté", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Ignore previous instructions &lt;script&gt;alert(1)&lt;/script&gt;</title>
      <link>https://example.org/a</link><description>&lt;img src=x onerror=alert(1)&gt;Résumé</description>
      <pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title></title><link>https://example.org/empty</link></item>
    </channel></rss>`
    const items = parseFeed(xml)
    expect(items).toHaveLength(1)
    expect(items[0].summary).not.toMatch(/<img|onerror/)
    expect(items[0].publishedAt).toBe("2026-11-13T10:00:00.000Z")
  })
  it("tolère un flux Atom et un flux invalide", () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>T</title><link href="https://example.org/t"/></entry></feed>`
    expect(parseFeed(atom)[0].url).toBe("https://example.org/t")
    expect(parseFeed("<html>not a feed</html>")).toEqual([])
  })
})

describe("moteur IA", () => {
  it("extrait l'objet JSON et refuse une réponse invalide", () => {
    expect(extractJson('Voici : {"fr": {"subject": "x"}} fin')).toEqual({ fr: { subject: "x" } })
    expect(() => extractJson("pas de JSON")).toThrow(AiOutputError)
    expect(() => extractJson('{"fr": {"subject": "tronqué"')).toThrow(AiOutputError)
    expect(() => extractJson("{ invalide }")).toThrow(AiOutputError)
  })
})

describe("contrôles éditoriaux", () => {
  const advises = (t: string) => FINANCIAL_ADVICE_PATTERNS.some((re) => re.test(t.toLowerCase()))
  it("détecte les formulations de conseil financier", () => {
    expect(advises("Achetez ce jeton avant lundi")).toBe(true)
    expect(advises("You should buy BTC now")).toBe(true)
    expect(advises("Rendement garanti de 20 %")).toBe(true)
  })
  it("n'interdit pas un compte rendu factuel", () => {
    expect(advises("Les commerçants de Nairobi peuvent désormais acheter en stablecoins")).toBe(false)
    expect(advises("The central bank published a sandbox framework")).toBe(false)
  })
})

describe("journalisation", () => {
  it("masque e-mails, jetons et clés", () => {
    expect(redactString("contact jane.doe@example.org")).toBe("contact [email]")
    expect(redactString("Authorization: Bearer abcdefghijklmnop")).toContain("Bearer [redacted]")
    expect(redactString("key sb_secret_abcdefghijkl")).toBe("key sb_secret_[redacted]")
    expect(redact({ apiKey: "x", nested: { password: "y", note: "ok" } })).toEqual({ apiKey: "[redacted]", nested: { password: "[redacted]", note: "ok" } })
  })
})

describe("événements", () => {
  const ev = { starts_at: "2026-12-01T23:00:00Z", ends_at: null }
  it("calcule à venir / en cours / terminé", () => {
    expect(eventTiming(ev, Date.parse("2026-12-01T22:59:00Z"))).toBe("upcoming")
    expect(eventTiming(ev, Date.parse("2026-12-02T00:30:00Z"))).toBe("ongoing")
    expect(eventTiming(ev, Date.parse("2026-12-02T01:01:00Z"))).toBe("past")
  })
  it("valide les liens Luma", () => {
    expect(normalizeLumaUrl("https://lu.ma/bib-toronto")).toBe("https://lu.ma/bib-toronto")
    expect(normalizeLumaUrl("https://lu.ma.evil.example/x")).toBeNull()
    expect(normalizeLumaUrl("javascript:alert(1)")).toBeNull()
  })
})
