import "server-only"
import { createHash } from "node:crypto"
import { XMLParser } from "fast-xml-parser"
import { getAdminClient } from "@/lib/supabase/admin"

/**
 * Veille quotidienne NEWS — légère et sans IA :
 *  - uniquement les sources explicitement autorisées (news_sources.enabled,
 *    avec auteur et date d'autorisation) ;
 *  - flux RSS/Atom uniquement, pas de scraping ;
 *  - normalisation, catégorisation par mots-clés, déduplication (URL
 *    canonique + empreinte du titre), provenance conservée.
 */

export type Theme = "innovation" | "adoption" | "entrepreneurship" | "talent" | "education" | "regulation"

const THEME_KEYWORDS: Record<Theme, string[]> = {
  regulation: ["regulat", "réglement", "law", "loi", "policy", "politique", "sec ", "central bank", "banque centrale", "compliance", "licen", "mica", "cbdc"],
  education: ["education", "éducation", "training", "formation", "course", "cours", "bootcamp", "university", "université", "scholarship", "bourse d'études"],
  talent: ["developer", "développeu", "talent", "hiring", "recrut", "jobs", "emploi", "engineer", "ingénieu", "community", "communauté"],
  entrepreneurship: ["startup", "start-up", "founder", "fondat", "funding", "financement", "raise", "lève", "accelerator", "accélérat", "venture", "grant", "subvention"],
  adoption: ["adoption", "payment", "paiement", "remittance", "transfert", "stablecoin", "use case", "cas d'usage", "merchant", "commerçant", "wallet", "portefeuille"],
  innovation: ["protocol", "protocole", "layer", "launch", "lance", "upgrade", "mainnet", "research", "recherche", "zk", "rollup"],
}

/** Sujets exclus de la ligne éditoriale (pas de conseil spéculatif). */
const EXCLUDED = ["price prediction", "prédiction de prix", "trading signal", "signal de trading", "pump", "to the moon", "airdrop farming", "memecoin"]

const REGION_KEYWORDS: Record<string, string[]> = {
  africa: ["africa", "afrique", "nigeria", "kenya", "ghana", "south africa", "afrique du sud", "senegal", "sénégal", "ethiopia", "éthiopie", "egypt", "égypte", "morocco", "maroc", "rwanda", "uganda", "ouganda", "cameroon", "cameroun", "côte d'ivoire", "ivory coast", "lagos", "nairobi", "accra"],
  caribbean: ["caribbean", "caraïbes", "jamaica", "jamaïque", "haiti", "haïti", "trinidad", "barbados", "bahamas", "puerto rico", "dominican", "guadeloupe", "martinique", "cuba"],
  diaspora: ["diaspora"],
}

export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    u.hash = ""
    for (const p of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|mc_)/i.test(p)) u.searchParams.delete(p)
    u.protocol = "https:"
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "")
    return u.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

export function titleFingerprint(title: string, url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "")
    } catch {
      return ""
    }
  })()
  const norm = title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
  return createHash("sha256").update(`${host}|${norm}`).digest("hex")
}

export function classify(text: string): { theme: Theme | null; regions: string[]; excluded: boolean } {
  const t = ` ${text.toLowerCase()} `
  const excluded = EXCLUDED.some((k) => t.includes(k))
  let best: Theme | null = null
  let bestScore = 0
  for (const [theme, words] of Object.entries(THEME_KEYWORDS) as [Theme, string[]][]) {
    const score = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0)
    if (score > bestScore) {
      best = theme
      bestScore = score
    }
  }
  const regions = Object.entries(REGION_KEYWORDS).filter(([, words]) => words.some((w) => t.includes(w))).map(([r]) => r)
  return { theme: best, regions, excluded }
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
const asText = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" && "#text" in v ? String((v as { "#text": unknown })["#text"]) : "")

interface FeedItem {
  title: string
  url: string
  summary: string
  publishedAt: string | null
}

export function parseFeed(xml: string): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: true })
  const doc = parser.parse(xml) as Record<string, unknown>
  const items: FeedItem[] = []
  const rss = (doc.rss as { channel?: { item?: unknown } } | undefined)?.channel?.item
  const atom = (doc.feed as { entry?: unknown } | undefined)?.entry
  const list = (rss ?? atom ?? []) as unknown
  for (const it of (Array.isArray(list) ? list : [list]) as Record<string, unknown>[]) {
    if (!it) continue
    const title = stripHtml(asText(it.title))
    let url = asText(it.link)
    if (!url && it.link) {
      const links = (Array.isArray(it.link) ? it.link : [it.link]) as Record<string, string>[]
      url = links.find((l) => !l["@_rel"] || l["@_rel"] === "alternate")?.["@_href"] ?? ""
    }
    const summary = stripHtml(asText(it.description) || asText(it.summary) || asText(it.content)).slice(0, 600)
    const dateRaw = asText(it.pubDate) || asText(it.published) || asText(it.updated)
    const date = dateRaw ? new Date(dateRaw) : null
    if (title && url) items.push({ title: title.slice(0, 300), url, summary, publishedAt: date && !isNaN(date.getTime()) ? date.toISOString() : null })
  }
  return items
}

export interface IngestReport {
  sources: number
  fetched: number
  inserted: number
  skipped: number
  failures: { source: string; reason: string }[]
}

export async function ingestNews(): Promise<IngestReport> {
  const admin = getAdminClient()
  const { data: sources } = await admin
    .from("news_sources")
    .select("id, name, feed_url, language, region_tags")
    .eq("enabled", true)
    .not("authorized_at", "is", null)
  const report: IngestReport = { sources: sources?.length ?? 0, fetched: 0, inserted: 0, skipped: 0, failures: [] }

  for (const s of (sources ?? []) as { id: string; name: string; feed_url: string; language: string | null; region_tags: string[] }[]) {
    try {
      const res = await fetch(s.feed_url, {
        headers: { "user-agent": "BIB-newsletter-watch/1.0 (+https://anbachain.org)" },
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const items = parseFeed(await res.text()).slice(0, 50)
      report.fetched += items.length
      const rows = items
        .map((it) => {
          const canonical = canonicalUrl(it.url)
          if (!canonical) return null
          const c = classify(`${it.title} ${it.summary}`)
          if (c.excluded) return null
          return {
            source_id: s.id,
            url: it.url,
            canonical_url: canonical,
            fingerprint: titleFingerprint(it.title, canonical),
            title: it.title,
            summary: it.summary || null,
            published_at: it.publishedAt,
            language: s.language,
            theme: c.theme,
            region_tags: [...new Set([...(s.region_tags ?? []), ...c.regions])],
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
      report.skipped += items.length - rows.length
      if (rows.length) {
        const { data, error } = await admin
          .from("news_items")
          .upsert(rows, { onConflict: "canonical_url", ignoreDuplicates: true })
          .select("id")
        if (error) {
          // Collision d'empreinte (même article, autre URL) : insertion ligne à ligne.
          for (const r of rows) {
            const { error: e } = await admin.from("news_items").insert(r)
            if (!e) report.inserted += 1
          }
        } else {
          report.inserted += data?.length ?? 0
        }
      }
      await admin.from("news_sources").update({ last_fetched_at: new Date().toISOString(), last_status: "ok" }).eq("id", s.id)
    } catch (e) {
      const reason = (e as Error).message.slice(0, 200)
      report.failures.push({ source: s.name, reason })
      await admin.from("news_sources").update({ last_fetched_at: new Date().toISOString(), last_status: `error: ${reason}` }).eq("id", s.id)
    }
  }
  return report
}
