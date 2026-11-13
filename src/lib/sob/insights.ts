import "server-only"
import { z } from "zod"
import { generateStructured, newBudget } from "@/lib/ai/engine"
import { getAdminClient } from "@/lib/supabase/admin"
import { getPublicClient } from "@/lib/supabase/public"
import { intlLocale } from "@/lib/content/locales"

/**
 * Insights IA State of BIB. Le moteur IA est le même que pour la newsletter.
 * Les chiffres sont calculés par le code ; le texte n'utilise que des
 * marqueurs {{fact:clé}}. Un insight est créé en BROUILLON : sa publication
 * sur le site est une action distincte d'un administrateur.
 */

const insightSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(20).max(1500),
  limitations: z.string().trim().min(10).max(600),
})

export type InsightContent = z.infer<typeof insightSchema> & { rendered_body: string; facts: Record<string, number> }

const LABELS: Record<string, string> = {
  devs_active_28d: "active developers in the last 28 days",
  ecosystems: "ecosystems touched",
  countries: "countries with at least one developer",
  cities: "cities",
  commits_lifetime: "lifetime commits",
}

export async function generateInsightDraft(locale: "fr" | "en" | "es", actorId: string) {
  const admin = getAdminClient()
  const { data: versions } = await admin
    .from("dataset_versions")
    .select("id, provider_version, as_of_date, is_current")
    .eq("source_id", "electric-capital-osdd")
    .in("status", ["published", "superseded"])
    .order("published_at", { ascending: false })
    .limit(2)
  const list = (versions ?? []) as { id: string; provider_version: string; as_of_date: string; is_current: boolean }[]
  const current = list.find((v) => v.is_current)
  if (!current) throw new Error("Aucune version State of BIB publiée dans Supabase.")
  const previous = list.find((v) => !v.is_current)

  const { data: obs } = await admin
    .from("metric_observations")
    .select("dataset_version_id, metric_key, value")
    .in("dataset_version_id", [current.id, previous?.id].filter((x): x is string => !!x))
    .eq("dimension_type", "total")
  const rows = (obs ?? []) as { dataset_version_id: string; metric_key: string; value: number }[]
  const facts: Record<string, number> = {}
  const comparison: Record<string, { current: number; previous: number | null }> = {}
  for (const key of Object.keys(LABELS)) {
    const cur = rows.find((r) => r.dataset_version_id === current.id && r.metric_key === key)
    if (!cur) continue
    const prev = previous ? rows.find((r) => r.dataset_version_id === previous.id && r.metric_key === key) : undefined
    facts[key] = Number(cur.value)
    if (prev) facts[`${key}_change`] = Number(cur.value) - Number(prev.value)
    comparison[key] = { current: Number(cur.value), previous: prev ? Number(prev.value) : null }
  }

  const system = `You write a short, sourced analysis of the "State of Black in Blockchain" dataset (Electric Capital Open Source Developer Data, CC BY 4.0), restricted to Africa and the Caribbean.
Rules: write in ${locale === "fr" ? "French" : locale === "es" ? "Spanish" : "English"}; never write a number yourself — use markers {{fact:KEY}} from the provided keys only; never describe the figures as measuring the diaspora; state limitations (geographic inference, open-source activity only, snapshot date); no investment advice. Answer with JSON {"title","body","limitations"} only.`
  const user = JSON.stringify({
    as_of_date: current.as_of_date,
    previous_as_of: previous?.as_of_date ?? null,
    available_fact_keys: Object.keys(facts),
    labels: LABELS,
    directions: Object.fromEntries(Object.entries(comparison).map(([k, v]) => [k, v.previous === null ? "no_previous" : v.current > v.previous ? "up" : v.current < v.previous ? "down" : "flat"])),
  })

  const { value, runId } = await generateStructured({ purpose: "sob_insight", system, user, schema: insightSchema, budget: newBudget() })

  // Contrôles hors LLM : aucun chiffre libre, marqueurs connus uniquement.
  const text = `${value.title} ${value.body} ${value.limitations}`
  const markers = [...text.matchAll(/\{\{fact:([a-z0-9_]+)\}\}/g)].map((m) => m[1])
  if (markers.some((m) => !(m in facts))) throw new Error("Insight refusé : marqueur d'indicateur inconnu.")
  if (/\d/.test(text.replace(/\{\{fact:[a-z0-9_]+\}\}/g, ""))) throw new Error("Insight refusé : chiffre non issu des données.")

  const nf = new Intl.NumberFormat(intlLocale(locale), { signDisplay: "auto" })
  const fill = (s: string) => s.replace(/\{\{fact:([a-z0-9_]+)\}\}/g, (_, k: string) => nf.format(facts[k]))
  const content: InsightContent = { ...value, title: fill(value.title), rendered_body: fill(value.body), limitations: fill(value.limitations), facts }

  const { data, error } = await admin
    .from("sob_insights")
    .insert({
      dataset_version_id: current.id,
      locale,
      status: "draft",
      content,
      sources: [{ name: "Electric Capital Open Source Developer Data", license: "CC BY 4.0", provider_version: current.provider_version, as_of_date: current.as_of_date }],
      ai_run_id: runId,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error("Enregistrement de l'insight impossible.")
  await admin.from("editorial_audit").insert({ actor_id: actorId, action: "sob_insight.generate", entity_type: "sob_insight", entity_id: data.id, details: { locale } })
  return data.id as string
}

/** Insight publié pour la version courante et la langue (affichage public). */
export async function getPublishedInsight(locale: string): Promise<{ content: InsightContent; sources: { as_of_date: string }[] } | null> {
  const supabase = getPublicClient()
  if (!supabase) return null
  const { data } = await supabase
    .from("sob_insights")
    .select("content, sources, dataset_versions!inner(is_current)")
    .eq("status", "published")
    .eq("locale", locale)
    .eq("dataset_versions.is_current", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { content: InsightContent; sources: { as_of_date: string }[] } | null) ?? null
}
