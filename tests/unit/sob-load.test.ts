import { createHash } from "node:crypto"
import { mkdtempSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildSobFixture, writeSobFixture } from "../helpers/sob-fixture.mjs"

const NAMES = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"] as const
const state = { configured: true, readFlag: true, version: null as null | { provider_version: string; published_at: string; dataset_artifacts: { name: string; storage_path: string; sha256: string }[] }, objects: new Map<string, string>(), dbError: false }

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }))
vi.mock("@/lib/env", () => ({
  env: { get flags() { return { sobReadFromSupabase: state.readFlag } } },
  isSupabaseAdminConfigured: () => state.configured,
}))
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    from: () => {
      const q = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q, maybeSingle: async () => (state.dbError ? { data: null, error: { code: "08006" } } : { data: state.version, error: null }) }
      return q
    },
    storage: { from: () => ({ download: async (p: string) => (state.objects.has(p) ? { data: new Blob([state.objects.get(p)!]), error: null } : { data: null, error: { message: "not found" } }) }) },
  }),
}))

const { loadSobState, isSobAvailable } = await import("@/lib/sob/load")
const sha = (t: string) => createHash("sha256").update(t, "utf8").digest("hex")

async function publish(version = "v-test", mutate?: (f: Record<string, unknown>) => void) {
  const f = await buildSobFixture({ version })
  const byName: Record<string, unknown> = { "meta.json": f.meta, "headline.json": f.headline, "country_map.json": f.countryMap, "top_cities.json": f.topCities, "ecosystem_mix.json": f.ecoMix, "tenure_cohort.json": f.cohort }
  mutate?.(byName)
  state.objects = new Map()
  const arts = NAMES.map((n) => {
    const text = JSON.stringify(byName[n])
    state.objects.set(`versions/${version}/${n}`, text)
    return { name: n, storage_path: `versions/${version}/${n}`, sha256: sha(text) }
  })
  state.version = { provider_version: version, published_at: "2026-11-10T00:00:00Z", dataset_artifacts: arts }
}

let tmp: string
beforeEach(() => {
  Object.assign(state, { configured: true, readFlag: true, version: null, objects: new Map(), dbError: false })
  delete process.env.SOB_E2E_FIXTURE_DIR
  tmp = mkdtempSync(path.join(os.tmpdir(), "sob-"))
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("chargement State of BIB", () => {
  it("version courante publiée : lue dans le bucket privé, empreintes vérifiées", async () => {
    await publish("v-test")
    const s = await loadSobState()
    expect(isSobAvailable(s) && s.origin).toBe("supabase")
    expect(isSobAvailable(s) && s.version).toBe("v-test")
  })

  it("artefact altéré (SHA-256 différent) : jamais servi", async () => {
    await publish()
    state.objects.set("versions/v-test/headline.json", JSON.stringify({ devs_active_28d: 999999 }))
    const s = await loadSobState()
    expect(s.origin).toBe("unavailable")
    expect(!isSobAvailable(s) && s.reason).toMatch(/SHA-256/)
  })

  it("version courante incohérente ou d'une autre version : refusée", async () => {
    await publish("v-test", (f) => { (f["headline.json"] as { devs_active_28d: number }).devs_active_28d += 5 })
    expect((await loadSobState()).origin).toBe("unavailable")
    await publish("v-test", (f) => { (f["meta.json"] as { dataset_version: string }).dataset_version = "autre" })
    const s = await loadSobState()
    expect(!isSobAvailable(s) && s.reason).toMatch(/autre version/)
  })

  it("aucune version publiée et copie du dépôt invalide : indisponibilité explicite, aucun chiffre", async () => {
    const s = await loadSobState()
    expect(s.origin).toBe("unavailable")
    expect(!isSobAvailable(s) && s.reason).toBe("aucune version publiée")
    expect(!isSobAvailable(s) && s.problems.length).toBeGreaterThan(0)
    expect("headline" in s).toBe(false)
  })

  it("Supabase en erreur : repli sur une copie VALIDE, signalée comme repli", async () => {
    state.dbError = true
    process.env.SOB_E2E_FIXTURE_DIR = await writeSobFixture(tmp, { version: "copie-valide" })
    const s = await loadSobState()
    expect(isSobAvailable(s) && s.origin).toBe("fallback")
    expect(isSobAvailable(s) && s.version).toBe("copie-valide")
  })

  it("Supabase en erreur et copie périmée : refus du repli", async () => {
    state.dbError = true
    process.env.SOB_E2E_FIXTURE_DIR = await writeSobFixture(tmp, { snapshotDate: "2026-01-10" })
    const s = await loadSobState()
    expect(s.origin).toBe("unavailable")
    expect(!isSobAvailable(s) && s.problems.join()).toMatch(/périmée/)
  })

  it("clé de service absente : aucune lecture anonyme, repli contrôlé", async () => {
    state.configured = false
    expect((await loadSobState()).origin).toBe("unavailable")
  })
})
