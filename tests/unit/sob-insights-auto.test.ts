/**
 * Analyses IA State of BIB automatiques.
 *  Scénario H : génération et publication sans approbation humaine.
 *  Scénario I : fournisseur IA indisponible → rien d'inventé, reprise bornée,
 *               statistiques non bloquées.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FakeDb } from "./helpers/fake-supabase"
import { insightProblems } from "@/lib/sob/insight-checks"

const db = new FakeDb()
const ai = { fail: null as null | string, body: (keys: string[]) => `La communauté poursuit son activité avec {{fact:${keys[0]}}} sur la période observée.` }

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => db }))
vi.mock("@/lib/env", () => ({ env: { sob: { insightsMaxAttempts: 2 } }, isSupabaseAdminConfigured: () => true }))
vi.mock("@/lib/ops/incidents", () => ({
  recordIncident: async (i: { kind: string; message: string; details?: Record<string, unknown> }) => void db.table("ops_incidents").push({ kind: i.kind, message: i.message, details: i.details ?? {} }),
}))
vi.mock("@/lib/ai/engine", () => ({
  newBudget: () => ({}),
  generateStructured: vi.fn(async ({ user }: { user: string }) => {
    if (ai.fail) throw new Error(ai.fail)
    const keys = JSON.parse(user).available_fact_keys as string[]
    return { value: { title: "État des données", body: ai.body(keys), limitations: "Activité open source uniquement ; localisation déduite ; Afrique et Caraïbes." }, runId: "run-ai" }
  }),
}))

const { runSobInsightsCycle, getPublishedInsight } = await import("@/lib/sob/insights")
const { generateStructured } = await import("@/lib/ai/engine")

function seed(mode: "auto" | "review" | "paused" | null = "auto") {
  db.tables = {}
  if (mode) db.table("automation_settings").push({ module: "sob_insights", mode })
  db.table("dataset_versions").push(
    { id: "v1", provider_version: "v1", as_of_date: "2026-10-01", is_current: false, status: "superseded", source_id: "electric-capital-osdd", published_at: "2026-10-02T00:00:00Z" },
    { id: "v2", provider_version: "v2", as_of_date: "2026-11-01", is_current: true, status: "published", source_id: "electric-capital-osdd", published_at: "2026-11-02T00:00:00Z" },
  )
  for (const [vid, devs] of [["v1", 4000], ["v2", 4400]] as const) {
    db.table("metric_observations").push({ dataset_version_id: vid, metric_key: "devs_active_28d", dimension_type: "total", value: devs })
  }
  db.table("sob_insights")
  db.table("ops_incidents")
  db.table("editorial_audit")
}

beforeEach(() => {
  ai.fail = null
  ai.body = (keys) => `La communauté poursuit son activité avec {{fact:${keys[0]}}} sur la période observée.`
  vi.mocked(generateStructured).mockClear()
  seed("auto")
})

describe("Scénario H — analyse générée et publiée automatiquement", () => {
  it("mode auto : publication sans approbation, rattachée à la version courante", async () => {
    const r = await runSobInsightsCycle(["fr", "en"])
    expect(r).toMatchObject({ mode: "auto", version: "v2", generated: ["fr", "en"], published: ["fr", "en"], errors: [] })
    const rows = db.table("sob_insights")
    expect(rows).toHaveLength(2)
    expect(rows.every((x) => x.status === "published" && x.dataset_version_id === "v2" && x.published_at)).toBe(true)
    // Le chiffre affiché vient de la version publiée (marqueur), pas du modèle.
    expect(String((rows[0].content as { rendered_body: string }).rendered_body)).toContain("4")
    expect(db.table("editorial_audit").filter((a) => a.action === "sob_insight.published")).toHaveLength(2)
  })

  it("relance : aucune analyse en double, aucun nouvel appel au modèle", async () => {
    await runSobInsightsCycle(["fr"])
    const again = await runSobInsightsCycle(["fr"])
    expect(again.skipped).toEqual(["fr"])
    expect(db.table("sob_insights")).toHaveLength(1)
    expect(generateStructured).toHaveBeenCalledTimes(1)
  })

  it("réglage absent : mode automatique par défaut", async () => {
    seed(null)
    expect((await runSobInsightsCycle(["fr"])).mode).toBe("auto")
  })

  it("un brouillon valide resté en attente pour la version courante est publié", async () => {
    db.table("sob_insights").push({ id: "d1", dataset_version_id: "v2", locale: "fr", status: "draft", content: {} })
    const r = await runSobInsightsCycle(["fr"])
    expect(r.published).toEqual(["fr"])
    expect(generateStructured).not.toHaveBeenCalled()
  })

  it("l'analyse d'une ancienne version n'est jamais présentée pour la nouvelle", async () => {
    db.table("sob_insights").push({ id: "old", dataset_version_id: "v1", locale: "fr", status: "published", content: { title: "ancienne" }, published_at: "2026-10-03T00:00:00Z" })
    const r = await runSobInsightsCycle(["fr"])
    expect(r.published).toEqual(["fr"])
    const current = db.table("sob_insights").filter((x) => x.dataset_version_id === "v2")
    expect(current).toHaveLength(1)
    // La lecture publique filtre sur la version courante (jointure is_current).
    expect(getPublishedInsight.toString()).toContain("dataset_versions.is_current")
  })

  it("modes optionnels : review laisse un brouillon, paused ne fait rien", async () => {
    seed("review")
    const r = await runSobInsightsCycle(["fr"])
    expect(r.published).toEqual([])
    expect(db.table("sob_insights")[0].status).toBe("draft")
    seed("paused")
    expect((await runSobInsightsCycle(["fr"])).generated).toEqual([])
    expect(db.table("sob_insights")).toHaveLength(0)
  })
})

describe("Scénario I — fournisseur IA indisponible", () => {
  it("rien n'est inventé ; l'échec est journalisé puis retenté dans la limite configurée", async () => {
    ai.fail = "provider_unavailable"
    const first = await runSobInsightsCycle(["fr"])
    expect(first.errors).toHaveLength(1)
    expect(db.table("sob_insights")).toHaveLength(0)
    expect(db.table("ops_incidents")[0]).toMatchObject({ kind: "sob.insight_failed", details: { version: "v2", locale: "fr", attempt: 1 } })
    await runSobInsightsCycle(["fr"])
    const third = await runSobInsightsCycle(["fr"])
    expect(third.deferred).toEqual(["fr"])
    expect(generateStructured).toHaveBeenCalledTimes(2)
    // Les statistiques ne sont pas touchées : la version reste publiée.
    expect(db.table("dataset_versions").find((v) => v.is_current)!.status).toBe("published")
  })

  it("le fournisseur revient : l'analyse est publiée au cycle suivant", async () => {
    ai.fail = "timeout"
    await runSobInsightsCycle(["fr"])
    ai.fail = null
    const r = await runSobInsightsCycle(["fr"])
    expect(r.published).toEqual(["fr"])
  })

  it("une nouvelle version repart avec un compteur de tentatives neuf", async () => {
    ai.fail = "timeout"
    await runSobInsightsCycle(["fr"])
    await runSobInsightsCycle(["fr"])
    db.table("dataset_versions").forEach((v) => (v.is_current = false))
    db.table("dataset_versions").push({ id: "v3", provider_version: "v3", as_of_date: "2026-11-08", is_current: true, status: "published", source_id: "electric-capital-osdd", published_at: "2026-11-09T00:00:00Z" })
    db.table("metric_observations").push({ dataset_version_id: "v3", metric_key: "devs_active_28d", dimension_type: "total", value: 4500 })
    ai.fail = null
    const r = await runSobInsightsCycle(["fr"])
    expect(r).toMatchObject({ version: "v3", published: ["fr"], deferred: [] })
  })

  it("analyse non conforme (chiffre libre) : refusée, jamais publiée", async () => {
    ai.body = () => "La communauté compte 5000 développeurs actifs selon nos calculs internes cette semaine."
    const r = await runSobInsightsCycle(["fr"])
    expect(r.published).toEqual([])
    expect(r.errors[0]).toMatch(/chiffre non issu des données/)
    expect(db.table("sob_insights")).toHaveLength(0)
  })
})

describe("contrôles éditoriaux automatiques d'une analyse", () => {
  const ok = { title: "État des données", body: "La communauté poursuit son activité avec {{fact:devs_active_28d}} sur la période.", limitations: "Activité open source uniquement." }
  const keys = ["devs_active_28d", "devs_active_28d_change"]

  it("analyse conforme acceptée", () => {
    expect(insightProblems(ok, keys, "flat")).toEqual([])
    expect(insightProblems({ ...ok, body: "Le nombre de développeurs actifs est en hausse, à {{fact:devs_active_28d}} sur la période." }, keys, "up")).toEqual([])
  })

  it("faits : chiffre libre, marqueur inconnu, aucun indicateur", () => {
    expect(insightProblems({ ...ok, body: `${ok.body} Soit 12 pays.` }, keys, "flat").join()).toMatch(/chiffre non issu/)
    expect(insightProblems({ ...ok, body: "Les développeurs sont {{fact:inconnu}} sur la période observée ici." }, keys, "flat").join()).toMatch(/marqueur d'indicateur inconnu/)
    expect(insightProblems({ ...ok, body: "La communauté poursuit son activité sur toute la période observée." }, keys, "flat").join()).toMatch(/aucun indicateur vérifiable/)
  })

  it("tendance : contradiction avec l'évolution réelle refusée", () => {
    const up = { ...ok, body: "Forte hausse des développeurs actifs, à {{fact:devs_active_28d}} sur la période." }
    expect(insightProblems(up, keys, "down").join()).toMatch(/hausse affirmée/)
    expect(insightProblems(up, keys, "no_previous").join()).toMatch(/sans version précédente/)
    expect(insightProblems({ ...ok, body: "Active developers declined to {{fact:devs_active_28d}} over the period observed." }, keys, "up").join()).toMatch(/baisse affirmée/)
    expect(insightProblems(up, keys, "flat").join()).toMatch(/stable/)
  })

  it("périmètre : autre région ou diaspora présentée comme mesurée refusées", () => {
    expect(insightProblems({ ...ok, body: `${ok.body} L'Europe suit la même voie.` }, keys, "flat").join()).toMatch(/hors périmètre/)
    expect(insightProblems({ ...ok, body: `${ok.body} La diaspora compte autant de développeurs.` }, keys, "flat").join()).toMatch(/diaspora/)
    expect(insightProblems({ ...ok, limitations: "Ces chiffres ne mesurent pas la diaspora." }, keys, "flat")).toEqual([])
  })

  it("règles éditoriales : fournisseur ou licence refusés", () => {
    expect(insightProblems({ ...ok, limitations: "Données Electric Capital." }, keys, "flat").join()).toMatch(/fournisseur/)
  })
})
