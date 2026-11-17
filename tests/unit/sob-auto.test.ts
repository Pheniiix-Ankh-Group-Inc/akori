/**
 * State of BIB automatique — côté site.
 *  Scénario G : après une publication, le site sert la nouvelle version sans
 *               redéploiement (invalidation des caches, version vérifiée).
 *  Scénario F : le site lit Supabase, jamais la copie du dépôt, même en retard.
 */
import { createHash } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildSobFixture } from "../helpers/sob-fixture.mjs"

const NAMES = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"] as const
type Artifact = { name: string; storage_path: string; sha256: string }
const backend = { version: null as null | { provider_version: string; published_at: string; dataset_artifacts: Artifact[] }, objects: new Map<string, string>(), reads: 0, rpcError: false }

// Cache applicatif simulé : mémorise jusqu'à l'invalidation de l'étiquette.
const cache = { store: new Map<string, unknown>(), tags: [] as string[], paths: [] as string[], keepStale: false }
vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...a: A) => Promise<R>, keys: string[]) => async (...args: A) => {
    const k = JSON.stringify([keys, args])
    if (!cache.store.has(k)) cache.store.set(k, await fn(...args))
    return cache.store.get(k) as R
  },
  revalidateTag: (tag: string) => {
    cache.tags.push(tag)
    if (!cache.keepStale) cache.store.clear()
  },
  revalidatePath: (p: string) => void cache.paths.push(p),
}))
vi.mock("@/i18n/routing", () => ({ routing: { locales: ["en", "fr", "es"] } }))
vi.mock("@/lib/env", () => ({ env: { flags: { sobReadFromSupabase: true } }, isSupabaseAdminConfigured: () => true, isAiConfigured: () => false }))
const incidents: { kind: string }[] = []
vi.mock("@/lib/ops/incidents", () => ({ recordIncident: async (i: { kind: string }) => void incidents.push(i) }))
vi.mock("@/lib/sob/insights", () => ({ runSobInsightsCycle: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    rpc: async () => backend.rpcError ? { data: null, error: { code: "08006" } } : { data: backend.version ? { ok: true, version: backend.version.provider_version, version_id: "fake-id" } : { ok: false, version: null, problems: ["aucune version courante"] }, error: null },
    from: () => {
      const q = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q, maybeSingle: async () => (backend.reads++, { data: backend.version, error: null }) }
      return q
    },
    storage: { from: () => ({ download: async (p: string) => (backend.objects.has(p) ? { data: new Blob([backend.objects.get(p)!]), error: null } : { data: null, error: { message: "absent" } }) }) },
  }),
}))

const { loadSobState, isSobAvailable } = await import("@/lib/sob/load")
const { refreshSob } = await import("@/lib/sob/refresh")

async function publish(version: string, devsBoost = 0) {
  const f = await buildSobFixture({ version })
  f.countryMap[0].devs_active_28d += devsBoost
  f.headline.devs_active_28d += devsBoost
  const byName: Record<string, unknown> = { "meta.json": f.meta, "headline.json": f.headline, "country_map.json": f.countryMap, "top_cities.json": f.topCities, "ecosystem_mix.json": f.ecoMix, "tenure_cohort.json": f.cohort }
  const arts = NAMES.map((n) => {
    const text = JSON.stringify(byName[n])
    const path = `versions/${version}/${createHash("sha256").update(text).digest("hex").slice(0, 16)}/${n}`
    backend.objects.set(path, text)
    return { name: n, storage_path: path, sha256: createHash("sha256").update(text, "utf8").digest("hex") }
  })
  backend.version = { provider_version: version, published_at: new Date().toISOString(), dataset_artifacts: arts }
  return f.headline.devs_active_28d as number
}

beforeEach(() => {
  backend.version = null
  backend.objects.clear()
  backend.reads = 0
  backend.rpcError = false
  cache.keepStale = false
  cache.store.clear()
  cache.tags.length = 0
  cache.paths.length = 0
  incidents.length = 0
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("Scénario G — actualisation automatique du site", () => {
  it("la nouvelle version devient visible après l'appel d'actualisation, sans redéploiement", async () => {
    const devs1 = await publish("v1")
    const first = await loadSobState()
    expect(isSobAvailable(first) && first.version).toBe("v1")

    // Nouvelle publication dans Supabase : tant que le cache n'est pas invalidé,
    // l'ancienne version reste servie (stratégie de cache conservée).
    const devs2 = await publish("v2", 250)
    const cached = await loadSobState()
    expect(isSobAvailable(cached) && cached.version).toBe("v1")
    expect(backend.reads).toBe(1)

    const report = await refreshSob("v2")
    expect(report.ok).toBe(true)
    expect(report.snapshot).toMatchObject({ origin: "supabase", version: "v2" })
    expect(report.cache.publicVersionVerified).toBe(false)
    expect(cache.tags).toContain("state-of-bib")
    // Accueil, State of BIB et page légale, dans chaque langue.
    expect(cache.paths).toEqual(expect.arrayContaining(["/en", "/fr/state_of_bib", "/es/data-sources"]))

    const after = await loadSobState()
    expect(isSobAvailable(after) && after.version).toBe("v2")
    expect(isSobAvailable(after) && after.headline.devs_active_28d).toBe(devs2)
    expect(devs2).toBe(devs1 + 250)
    expect(incidents).toEqual([])
  })

  it("version attendue non servie : signalé (le workflow échoue), jamais un faux succès", async () => {
    await publish("v1")
    const report = await refreshSob("v2")
    expect(report.ok).toBe(false)
    expect(report.snapshot.version).toBe("v1")
    expect(incidents.map((i) => i.kind)).toEqual(["sob.verification_failed"])
  })

  it("aucune version publiée : état d'indisponibilité, rien d'inventé", async () => {
    const report = await refreshSob(null)
    expect(report.ok).toBe(false)
    expect(report.snapshot).toMatchObject({ origin: "unavailable", version: null })
  })

  it("stale-while-revalidate cannot cause a false 409", async () => {
    await publish("v1")
    await loadSobState()
    cache.keepStale = true
    await publish("v2")
    const report = await refreshSob("v2")
    expect(report.ok).toBe(true)
    expect(report.snapshot.version).toBe("v2")
    expect(report.cache.publicVersionVerified).toBe(false)
    const stillStale = await loadSobState()
    expect(isSobAvailable(stillStale) && stillStale.version).toBe("v1")
  })

  it("RPC unavailable: report 503 without false success", async () => {
    await publish("v2")
    backend.rpcError = true
    const report = await refreshSob("v2")
    expect(report.ok).toBe(false)
    expect(report.statusCode).toBe(503)
  })

  it("corrupted Storage artifact is refused after direct validation", async () => {
    await publish("v2")
    const path = backend.version!.dataset_artifacts.find((a) => a.name === "headline.json")!.storage_path
    backend.objects.set(path, '{"tampered":true}')
    const report = await refreshSob("v2")
    expect(report.ok).toBe(false)
    expect(report.statusCode).toBe(409)
  })

  it("moteur IA non configuré : les statistiques sont actualisées, seule l'analyse est différée", async () => {
    await publish("v1")
    const report = await refreshSob("v1")
    expect(report.ok).toBe(true)
    expect(report.insights).toEqual({ skipped: expect.stringContaining("différées") })
  })
})

describe("Scénario F — le site ne dépend pas de la copie du dépôt", () => {
  it("la version Supabase est servie alors que la copie du dépôt est ancienne et invalide", async () => {
    await publish("v9")
    const s = await loadSobState()
    expect(isSobAvailable(s) && s.origin).toBe("supabase")
    expect(isSobAvailable(s) && s.version).toBe("v9")
    // La copie du dépôt (avril 2026) n'est jamais affichée à la place.
    expect(isSobAvailable(s) && s.meta.dataset_version).toBe("v9")
  })
})
