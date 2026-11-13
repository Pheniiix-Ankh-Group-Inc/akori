import "server-only"
import { getAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"
import { pickTranslation } from "@/lib/content/locales"
import { normalizeLumaUrl } from "@/lib/luma"
import type { NewsletterLocale } from "@/lib/brevo"

/**
 * Données d'entrée d'une édition, toutes issues de contenus PUBLIÉS ou de
 * sources AUTORISÉES. Les chiffres sont calculés ici, jamais par l'IA.
 *   BIB Events        ← événements publiés à venir
 *   BIB Highlights    ← rétrospectives publiées récentes
 *   Blockchain Insights ← statistiques State of BIB versionnées
 *   Blockchain News   ← actualités des sources autorisées
 */

export interface Fact {
  key: string
  label: Record<NewsletterLocale, string>
  value: number
  previous: number | null
  asOf: string
}

export interface NewsInput {
  id: string
  title: string
  summary: string | null
  url: string
  sourceName: string
  sourceTerms: string
  publishedAt: string | null
  theme: string | null
  regions: string[]
}

export interface EventInput {
  id: string
  startsAt: string
  timeZone: string
  city: string | null
  mode: string
  title: Record<NewsletterLocale, string | null>
  url: Record<NewsletterLocale, string>
  lumaUrl: string | null
}

export interface StoryInput {
  id: string
  title: Record<NewsletterLocale, string | null>
  summary: Record<NewsletterLocale, string | null>
  url: Record<NewsletterLocale, string>
}

export interface EditionInputs {
  facts: Fact[]
  sob: { versionId: string | null; asOf: string | null; source: string; license: string }
  news: NewsInput[]
  events: EventInput[]
  stories: StoryInput[]
}

const localePath = (locale: NewsletterLocale) => (locale === "fr" ? "/fr" : "")

const FACT_LABELS: Record<string, Record<NewsletterLocale, string>> = {
  devs_active_28d: { fr: "développeurs actifs (28 jours)", en: "active developers (28 days)" },
  ecosystems: { fr: "écosystèmes", en: "ecosystems" },
  countries: { fr: "pays", en: "countries" },
  cities: { fr: "villes", en: "cities" },
  commits_lifetime: { fr: "commits cumulés", en: "lifetime commits" },
}

export async function gatherInputs(sendSlotIso: string): Promise<EditionInputs> {
  const admin = getAdminClient()
  const now = new Date()
  const horizon = new Date(now.getTime() + 45 * 86400000).toISOString()
  const since = new Date(now.getTime() - 8 * 86400000).toISOString()
  const storiesSince = new Date(now.getTime() - 60 * 86400000).toISOString()

  const [eventsRes, storiesRes, newsRes, versionsRes] = await Promise.all([
    admin
      .from("events")
      .select("id, slug, starts_at, time_zone, city, mode, luma_url, event_translations(locale, title, summary, description)")
      .eq("status", "published")
      .gte("starts_at", sendSlotIso)
      .lte("starts_at", horizon)
      .order("starts_at")
      .limit(10),
    admin
      .from("stories")
      .select("id, slug, published_at, story_translations(locale, title, summary, body, seo_description)")
      .eq("status", "published")
      .gte("published_at", storiesSince)
      .order("published_at", { ascending: false })
      .limit(6),
    admin
      .from("news_items")
      .select("id, title, summary, canonical_url, published_at, theme, region_tags, news_sources!inner(name, usage_terms, enabled)")
      .gte("fetched_at", since)
      .not("theme", "is", null)
      .eq("news_sources.enabled", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(60),
    admin
      .from("dataset_versions")
      .select("id, as_of_date, status, is_current, published_at")
      .eq("source_id", "electric-capital-osdd")
      .in("status", ["published", "superseded"])
      .order("published_at", { ascending: false })
      .limit(2),
  ])

  type Ev = { id: string; slug: string; starts_at: string; time_zone: string; city: string | null; mode: string; luma_url: string | null; event_translations: { locale: string; title: string; summary: string | null; description: string | null }[] }
  const events: EventInput[] = ((eventsRes.data ?? []) as Ev[]).map((e) => ({
    id: e.id,
    startsAt: e.starts_at,
    timeZone: e.time_zone,
    city: e.city,
    mode: e.mode,
    title: {
      fr: e.event_translations.find((t) => t.locale === "fr")?.title ?? null,
      en: e.event_translations.find((t) => t.locale === "en")?.title ?? null,
    },
    url: {
      fr: `${env.siteUrl}${localePath("fr")}/evenements/${e.slug}`,
      en: `${env.siteUrl}${localePath("en")}/evenements/${e.slug}`,
    },
    lumaUrl: normalizeLumaUrl(e.luma_url),
  }))

  type St = { id: string; slug: string; story_translations: { locale: string; title: string; summary: string | null; body: string | null; seo_description: string | null }[] }
  const stories: StoryInput[] = ((storiesRes.data ?? []) as St[]).map((s) => {
    const fr = s.story_translations.find((t) => t.locale === "fr")
    const en = s.story_translations.find((t) => t.locale === "en")
    return {
      id: s.id,
      title: { fr: fr?.title ?? null, en: en?.title ?? null },
      summary: { fr: fr?.summary ?? null, en: en?.summary ?? null },
      url: {
        fr: `${env.siteUrl}${localePath("fr")}/en-action/${s.slug}`,
        en: `${env.siteUrl}${localePath("en")}/en-action/${s.slug}`,
      },
    }
  })

  type Nw = { id: string; title: string; summary: string | null; canonical_url: string; published_at: string | null; theme: string | null; region_tags: string[]; news_sources: { name: string; usage_terms: string } }
  const priority = (n: Nw) => (n.region_tags?.some((r) => ["africa", "caribbean", "diaspora"].includes(r)) ? 0 : 1)
  const news: NewsInput[] = ((newsRes.data ?? []) as unknown as Nw[])
    .sort((a, b) => priority(a) - priority(b))
    .slice(0, 12)
    .map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      url: n.canonical_url,
      sourceName: n.news_sources.name,
      sourceTerms: n.news_sources.usage_terms,
      publishedAt: n.published_at,
      theme: n.theme,
      regions: n.region_tags ?? [],
    }))

  // Indicateurs : version courante et version précédente (comparaison).
  const versions = (versionsRes.data ?? []) as { id: string; as_of_date: string; is_current: boolean }[]
  const current = versions.find((v) => v.is_current) ?? null
  const previous = versions.find((v) => !v.is_current) ?? null
  const facts: Fact[] = []
  if (current) {
    const ids = [current.id, previous?.id].filter((x): x is string => !!x)
    const { data: obs } = await admin
      .from("metric_observations")
      .select("dataset_version_id, metric_key, value, as_of_date")
      .in("dataset_version_id", ids)
      .eq("dimension_type", "total")
    const rows = (obs ?? []) as { dataset_version_id: string; metric_key: string; value: number; as_of_date: string }[]
    for (const key of Object.keys(FACT_LABELS)) {
      const cur = rows.find((r) => r.dataset_version_id === current.id && r.metric_key === key)
      if (!cur) continue
      const prev = previous ? rows.find((r) => r.dataset_version_id === previous.id && r.metric_key === key) : undefined
      facts.push({ key, label: FACT_LABELS[key], value: Number(cur.value), previous: prev ? Number(prev.value) : null, asOf: cur.as_of_date })
    }
  }

  return {
    facts,
    sob: {
      versionId: current?.id ?? null,
      asOf: current?.as_of_date ?? null,
      source: "Electric Capital Open Source Developer Data",
      license: "CC BY 4.0",
    },
    news,
    events,
    stories,
  }
}

/** Titre localisé d'un contenu, avec repli explicite (jamais de traduction générée). */
export function localizedTitle(map: Record<NewsletterLocale, string | null>, locale: NewsletterLocale): string | null {
  const picked = pickTranslation(
    (Object.entries(map) as [string, string | null][]).filter(([, v]) => !!v).map(([l, v]) => ({ locale: l, v: v! })),
    locale,
  )
  return picked?.value.v ?? null
}
