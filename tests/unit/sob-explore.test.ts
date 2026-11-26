import { describe, expect, it } from "vitest"
import {
  DEFAULT_FILTERS,
  cohortSeries,
  colorDomain,
  countryStats,
  downsample,
  monthRange,
  parseFilters,
  rankEcosystems,
  serializeFilters,
  mergeFilterParams,
} from "@/lib/sob/explore"
import type { SobCohort, SobCountry, SobEcosystem } from "@/components/state-of-bib/types"

// Données fictives de test uniquement.
const map: SobCountry[] = [
  { iso_a3: "NGA", name: "Nigeria", region: "Africa", devs_active_28d: 10, commits_lifetime: 500, commits_last_12m: 50 },
  { iso_a3: "KEN", name: "Kenya", region: "Africa", devs_active_28d: 5, commits_lifetime: 300, commits_last_12m: 70 },
  { iso_a3: "JAM", name: "Jamaica", region: "Caribbean", devs_active_28d: 2, commits_lifetime: 200, commits_last_12m: 10 },
  { iso_a3: "HTI", name: "Haiti", region: "Caribbean", devs_active_28d: null as unknown as number, commits_lifetime: 0, commits_last_12m: 0 },
]
const months = ["2026-01", "2026-02", "2026-03", "2026-04"]
const ecos: SobEcosystem[] = [
  { id: 1, name: "A", devs_recent: 40, series_devs: [10, 20, 30, 40], series_indexed: [] },
  { id: 2, name: "B", devs_recent: 50, series_devs: [50, 45, 50, 50], series_indexed: [] },
  { id: 3, name: "C", devs_recent: 5, series_devs: [null as unknown as number, 1, 2, 5], series_indexed: [] },
]
const cohort: SobCohort = { months, devs_0_1y: [1, 2, 3, 4], devs_1_2y: [5, 5, null as unknown as number, 5], devs_2y_plus: [10, 10, 10, 10] }

describe("filtres partagés : URL", () => {
  it("aller-retour URL sans perte et URL minimale par défaut", () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe("")
    const f = { ...DEFAULT_FILTERS, region: "Africa" as const, metric: "devs_active_28d" as const, country: "NGA", compare: "KEN", ecosystem: 2, from: "2026-02", to: "2026-03", ecoSort: "growth_rel" as const, cohorts: ["devs_0_1y" as const], cohortMode: "share" as const }
    expect(parseFilters(serializeFilters(f))).toEqual(f)
  })
  it("valeurs invalides ou inconnues ignorées (pas d'injection)", () => {
    const f = parseFilters(new URLSearchParams("region=Mars&metric=drop&country=<x>&compare=NGA&eco=-1&from=2026-13&sort=x&cohorts=evil"), {
      countries: new Set(["NGA", "KEN"]),
      ecosystems: new Set([1]),
      months,
    })
    expect(f).toEqual({ ...DEFAULT_FILTERS })
  })
  it("comparaison exige un pays principal différent ; période inversée corrigée", () => {
    expect(parseFilters(new URLSearchParams("country=NGA&compare=NGA")).compare).toBeNull()
    const f = parseFilters(new URLSearchParams("from=2026-04&to=2026-01"), { months })
    expect([f.from, f.to]).toEqual(["2026-01", "2026-04"])
  })
})

describe("carte : métriques et filtres cumulés", () => {
  it("rang et part calculés dans la région filtrée, valeur absente = null", () => {
    const s = countryStats(map, { region: "Caribbean", metric: "devs_active_28d" })
    expect([...s.keys()]).toEqual(["JAM", "HTI"])
    expect(s.get("JAM")).toMatchObject({ value: 2, rank: 1, share: 1 })
    expect(s.get("HTI")).toMatchObject({ value: null, rank: null, share: null })
  })
  it("changement de métrique : nouveau classement", () => {
    const a = countryStats(map, { region: "all", metric: "commits_lifetime" })
    const b = countryStats(map, { region: "all", metric: "commits_last_12m" })
    expect(a.get("NGA")!.rank).toBe(1)
    expect(b.get("KEN")!.rank).toBe(1)
  })
  it("échelle recalculée ; carte sans données = pas d'échelle", () => {
    expect(colorDomain(countryStats(map, { region: "Africa", metric: "commits_lifetime" }))).toEqual([300, 500])
    expect(colorDomain(countryStats([], { region: "all", metric: "commits_lifetime" }))).toBeNull()
    expect(colorDomain(countryStats(map.slice(3), { region: "all", metric: "commits_lifetime" }))).toBeNull()
  })
})

describe("écosystèmes : période et tri", () => {
  it("variations absolue et relative sur la période choisie", () => {
    const rows = rankEcosystems(ecos, months, { from: "2026-02", to: "2026-04", ecoSort: "growth_abs" })
    expect(rows.map((r) => r.name)).toEqual(["A", "B", "C"])
    expect(rows[0]).toMatchObject({ first: 20, last: 40, growthAbs: 20, growthRel: 1 })
  })
  it("valeur initiale absente : début au premier mois observé, sans interpolation", () => {
    const c = rankEcosystems(ecos, months, { from: null, to: null, ecoSort: "devs_recent" }).find((r) => r.id === 3)!
    expect(c.series[0]).toBeNull()
    expect(c).toMatchObject({ first: 1, last: 5, growthAbs: 4 })
  })
  it("tri relatif : valeurs indéfinies en fin", () => {
    const rows = rankEcosystems([...ecos, { id: 9, name: "Z", devs_recent: 1, series_devs: [0, 0, 0, 0], series_indexed: [] }], months, { from: null, to: null, ecoSort: "growth_rel" })
    expect(rows[rows.length - 1].name).toBe("Z")
  })
  it("plage hors données : bornes des données", () => {
    expect(monthRange(months, "1999-01", null)).toEqual([0, 3])
    expect(monthRange([], null, null)).toEqual([0, -1])
  })
})

describe("cohortes", () => {
  it("catégories masquées exclues du total ; valeur manquante non comptée", () => {
    const s = cohortSeries(cohort, { from: "2026-03", to: "2026-03", cohorts: ["devs_0_1y", "devs_1_2y"] })
    expect(s).toEqual([{ month: "2026-03", values: { devs_0_1y: 3, devs_1_2y: null, devs_2y_plus: 10 }, total: 3 }])
  })
})

describe("grand nombre de points", () => {
  it("réduit l'affichage en ne gardant que des observations réelles", () => {
    const pts = Array.from({ length: 20_000 }, (_, i) => ({ i, v: Math.sin(i / 50) * 100 }))
    const t0 = performance.now()
    const out = downsample(pts, 400, (p) => p.v)
    expect(performance.now() - t0).toBeLessThan(200)
    expect(out.length).toBeLessThanOrEqual(400)
    expect(out[0]).toBe(pts[0])
    expect(out[out.length - 1]).toBe(pts[pts.length - 1])
    expect(out.every((p) => pts[p.i] === p)).toBe(true)
  })
})

describe("mergeFilterParams — conservation de la version historique", () => {
  const base = { ...DEFAULT_FILTERS, cohorts: [...DEFAULT_FILTERS.cohorts] }
  it("garde ?version quand un filtre change", () => {
    const qs = mergeFilterParams(new URLSearchParams("version=20261018T120000&region=all"), { ...base, region: "Caribbean" })
    expect(qs.get("version")).toBe("20261018T120000")
    expect(qs.get("region")).toBe("Caribbean")
  })
  it("retire les filtres revenus à leur valeur par défaut sans toucher aux autres paramètres", () => {
    const qs = mergeFilterParams(new URLSearchParams("version=v1&country=NGA&compare=KEN&utm_source=x"), base)
    expect(qs.get("country")).toBeNull()
    expect(qs.get("compare")).toBeNull()
    expect(qs.get("version")).toBe("v1")
    expect(qs.get("utm_source")).toBe("x")
  })
  it("réinitialisation : la version reste sélectionnée", () => {
    const qs = mergeFilterParams(new URLSearchParams("version=v2&metric=commits_lifetime&cmode=share"), base)
    expect(qs.toString()).toBe("version=v2")
  })
})
