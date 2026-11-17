import "server-only"
import { z } from "zod"
import { generateStructured, newBudget } from "@/lib/ai/engine"
import { getAdminClient } from "@/lib/supabase/admin"
import { insightProblems, type Direction } from "@/lib/sob/insight-checks"
import { recordIncident } from "@/lib/ops/incidents"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
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

export async function generateInsightDraft(locale: "fr" | "en" | "es", actorId: string | null) {
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

  const system = `You write a short, sourced analysis of the "State of Black in Blockchain" dataset, restricted to Africa and the Caribbean.
Rules: never name the data provider, the dataset or its licence (they are credited on the site's legal page only); write in ${locale === "fr" ? "French" : locale === "es" ? "Spanish" : "English"}; never write a number yourself — use markers {{fact:KEY}} from the provided keys only; never describe the figures as measuring the diaspora and never mention any region other than Africa and the Caribbean; describe a rise or a fall only as given in "directions" (if "no_previous", describe no change at all); state limitations (geographic inference, open-source activity only, snapshot date); no investment advice. Answer with JSON {"title","body","limitations"} only.`
  const user = JSON.stringify({
    as_of_date: current.as_of_date,
    previous_as_of: previous?.as_of_date ?? null,
    available_fact_keys: Object.keys(facts),
    labels: LABELS,
    directions: Object.fromEntries(Object.entries(comparison).map(([k, v]) => [k, v.previous === null ? "no_previous" : v.current > v.previous ? "up" : v.current < v.previous ? "down" : "flat"])),
  })

  const keys = Object.keys(facts)
  const { value, runId } = await generateStructured({
    purpose: "sob_insight",
    system,
    user,
    schema: insightSchema,
    budget: newBudget(),
    // Fournisseur « mock » (hors production) : texte neutre, marqueurs uniquement.
    mock: () => ({
      title: locale === "fr" ? "[Simulation] État des données" : locale === "es" ? "[Simulación] Estado de los datos" : "[Simulation] State of the data",
      // Aucun libellé chiffré : seuls les marqueurs portent des valeurs.
      body: keys
        .slice(0, 2)
        .map((k) => `${locale === "fr" ? "Indicateur suivi" : locale === "es" ? "Indicador seguido" : "Tracked indicator"} : {{fact:${k}}}.`)
        .join(" "),
      limitations:
        locale === "fr"
          ? "Texte simulé : activité open source uniquement, géographie déduite, Afrique et Caraïbes."
          : locale === "es"
            ? "Texto simulado: solo actividad de código abierto, geografía inferida, África y el Caribe."
            : "Simulated text: open-source activity only, inferred geography, Africa and the Caribbean.",
    }),
  })

  // Contrôles hors modèle : faits, tendance, périmètre, règles éditoriales.
  const main = comparison.devs_active_28d
  const direction: Direction = !main || main.previous === null ? "no_previous" : main.current > main.previous ? "up" : main.current < main.previous ? "down" : "flat"
  const problems = insightProblems(value, Object.keys(facts), direction)
  if (problems.length) throw new Error(`Insight refusé : ${problems.join(" ; ")}.`)

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

export type AutomationMode = "auto" | "review" | "paused"

/** Mode d'automatisation d'un module (lecture serveur ; défaut « review »). */
export async function automationMode(module: "sob" | "sob_insights" | "newsletter"): Promise<AutomationMode> {
  const { data } = await getAdminClient().from("automation_settings").select("mode").eq("module", module).maybeSingle()
  const mode = (data as { mode?: string } | null)?.mode
  if (mode === "auto" || mode === "paused" || mode === "review") return mode
  // Réglage absent : State of BIB fonctionne en automatique (MVP) ; la
  // newsletter garde la revue par défaut.
  return module === "newsletter" ? "review" : "auto"
}

export interface InsightCycleReport {
  mode: AutomationMode
  version: string | null
  generated: string[]
  published: string[]
  skipped: string[]
  /** Langues dont le nombre de tentatives est épuisé pour cette version. */
  deferred: string[]
  errors: string[]
}

const INSIGHT_FAILED = "sob.insight_failed"

/**
 * Cycle AUTOMATIQUE des analyses IA, aligné sur la version State of BIB
 * courante et le mode « sob_insights » (auto par défaut) :
 *   auto   → analyse générée, contrôlée (faits, tendance, périmètre, règles
 *            éditoriales) puis publiée, sans approbation humaine ; un
 *            brouillon valide resté en attente pour la version courante est
 *            publié lui aussi ;
 *   review → brouillons à valider (mode optionnel) ; paused → rien.
 * Un échec (fournisseur IA indisponible, analyse refusée) n'invente rien et ne
 * bloque jamais les statistiques : il est journalisé et retenté aux cycles
 * suivants, dans la limite de SOB_INSIGHTS_MAX_ATTEMPTS par version et langue.
 * Une analyse n'est jamais rattachée à une autre version que celle dont elle
 * décrit les chiffres.
 */
export async function runSobInsightsCycle(locales: ("fr" | "en" | "es")[] = ["fr", "en", "es"]): Promise<InsightCycleReport> {
  const mode = await automationMode("sob_insights")
  const report: InsightCycleReport = { mode, version: null, generated: [], published: [], skipped: [], deferred: [], errors: [] }
  if (mode === "paused") return report
  const admin = getAdminClient()
  const { data: current } = await admin
    .from("dataset_versions")
    .select("id, provider_version")
    .eq("source_id", "electric-capital-osdd")
    .eq("is_current", true)
    .maybeSingle()
  const cur = current as { id: string; provider_version: string } | null
  if (!cur) return report
  report.version = cur.provider_version
  const { data: existing } = await admin.from("sob_insights").select("id, locale, status").eq("dataset_version_id", cur.id).neq("status", "rejected")
  const byLocale = new Map(((existing ?? []) as { id: string; locale: string; status: string }[]).map((r) => [r.locale, r]))
  const { data: failures } = await admin.from("ops_incidents").select("details").eq("kind", INSIGHT_FAILED).eq("details->>version", cur.provider_version)
  const attempts = new Map<string, number>()
  for (const f of (failures ?? []) as { details: { locale?: string } | null }[]) {
    const l = f.details?.locale ?? ""
    attempts.set(l, (attempts.get(l) ?? 0) + 1)
  }

  const publish = async (id: string, locale: string) => {
    const { error } = await admin.from("sob_insights").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id)
    if (error) throw new Error("publication automatique impossible")
    await admin.from("editorial_audit").insert({ actor_id: null, action: "sob_insight.published", entity_type: "sob_insight", entity_id: id, details: { mode, by: "automation", version: cur.provider_version } })
    report.published.push(locale)
  }

  for (const locale of locales) {
    const have = byLocale.get(locale)
    try {
      if (have?.status === "published") {
        report.skipped.push(locale)
        continue
      }
      if (have) {
        // Brouillon déjà contrôlé pour CETTE version : publié en mode auto.
        if (mode === "auto") await publish(have.id, locale)
        else report.skipped.push(locale)
        continue
      }
      if ((attempts.get(locale) ?? 0) >= env.sob.insightsMaxAttempts) {
        report.deferred.push(locale)
        continue
      }
      const id = await generateInsightDraft(locale, null)
      report.generated.push(locale)
      if (mode === "auto") await publish(id, locale)
    } catch (e) {
      const message = (e as Error).message.slice(0, 200)
      report.errors.push(`${locale}: ${message}`)
      try {
        await recordIncident({ kind: INSIGHT_FAILED, severity: "warning", message: `Analyse State of BIB ${cur.provider_version} (${locale}) non publiée : ${message}`, details: { version: cur.provider_version, locale, attempt: (attempts.get(locale) ?? 0) + 1 } })
      } catch {
        /* l'échec reste dans le rapport du cycle */
      }
    }
  }
  return report
}

/** Insight publié pour la version courante et la langue (affichage public). */
export async function getPublishedInsight(locale: string): Promise<{ content: InsightContent; sources: { as_of_date: string }[] } | null> {
  // Lecture serveur (clé de service) : aucune lecture anonyme des analyses.
  if (!isSupabaseAdminConfigured()) return null
  const { data } = await getAdminClient()
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
