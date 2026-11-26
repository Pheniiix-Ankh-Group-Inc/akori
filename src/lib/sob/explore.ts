/**
 * Observatoire State of BIB — état des filtres partagés et calculs purs.
 *
 * Aucune donnée n'est inventée ni interpolée : les fonctions ne font que
 * filtrer, trier et agréger les valeurs présentes dans l'instantané. Une
 * valeur absente reste absente (null) et n'est jamais remplacée par 0 dans
 * un affichage de métrique.
 */
import type { SobCohort, SobCountry, SobEcosystem } from "@/components/state-of-bib/types"

export const METRICS = ["commits_lifetime", "devs_active_28d", "commits_last_12m"] as const
export type Metric = (typeof METRICS)[number]

export const REGIONS = ["all", "Africa", "Caribbean"] as const
export type Region = (typeof REGIONS)[number]

export const ECO_SORTS = ["devs_recent", "growth_abs", "growth_rel", "start"] as const
export type EcoSort = (typeof ECO_SORTS)[number]

export const COHORT_KEYS = ["devs_0_1y", "devs_1_2y", "devs_2y_plus"] as const
export type CohortKey = (typeof COHORT_KEYS)[number]

export interface SobFilters {
  region: Region
  metric: Metric
  /** Pays sélectionné (ISO alpha-3) et pays comparé. */
  country: string | null
  compare: string | null
  /** Écosystème mis en évidence (identifiant). */
  ecosystem: number | null
  /** Période inclusive au format AAAA-MM (null = bornes des données). */
  from: string | null
  to: string | null
  ecoSort: EcoSort
  /** Catégories de cohortes affichées. */
  cohorts: CohortKey[]
  cohortMode: "count" | "share"
}

export const DEFAULT_FILTERS: SobFilters = {
  region: "all",
  metric: "commits_lifetime",
  country: null,
  compare: null,
  ecosystem: null,
  from: null,
  to: null,
  ecoSort: "devs_recent",
  cohorts: [...COHORT_KEYS],
  cohortMode: "count",
}

const ISO3 = /^[A-Z]{3}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** Lecture tolérante de l'URL : toute valeur inconnue revient au défaut. */
export function parseFilters(params: URLSearchParams, known?: { countries?: Set<string>; ecosystems?: Set<number>; months?: string[] }): SobFilters {
  const f: SobFilters = { ...DEFAULT_FILTERS, cohorts: [...DEFAULT_FILTERS.cohorts] }
  const region = params.get("region")
  if (region && (REGIONS as readonly string[]).includes(region)) f.region = region as Region
  const metric = params.get("metric")
  if (metric && (METRICS as readonly string[]).includes(metric)) f.metric = metric as Metric
  const pick = (k: string) => {
    const v = params.get(k)?.toUpperCase() ?? null
    return v && ISO3.test(v) && (!known?.countries || known.countries.has(v)) ? v : null
  }
  f.country = pick("country")
  f.compare = pick("compare")
  if (f.compare && f.compare === f.country) f.compare = null
  if (f.compare && !f.country) f.compare = null
  const eco = Number(params.get("eco"))
  if (Number.isInteger(eco) && eco > 0 && (!known?.ecosystems || known.ecosystems.has(eco))) f.ecosystem = eco
  const months = known?.months
  const month = (k: string) => {
    const v = params.get(k)
    return v && MONTH.test(v) && (!months || months.includes(v)) ? v : null
  }
  f.from = month("from")
  f.to = month("to")
  if (f.from && f.to && f.from > f.to) [f.from, f.to] = [f.to, f.from]
  const sort = params.get("sort")
  if (sort && (ECO_SORTS as readonly string[]).includes(sort)) f.ecoSort = sort as EcoSort
  const cohorts = params.get("cohorts")
  if (cohorts !== null) {
    const list = cohorts.split(",").filter((c): c is CohortKey => (COHORT_KEYS as readonly string[]).includes(c))
    f.cohorts = list.length ? COHORT_KEYS.filter((k) => list.includes(k)) : [...COHORT_KEYS]
  }
  if (params.get("cmode") === "share") f.cohortMode = "share"
  return f
}

/** Écriture minimale : seules les valeurs différentes du défaut figurent dans l'URL. */
export function serializeFilters(f: SobFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.region !== "all") p.set("region", f.region)
  if (f.metric !== DEFAULT_FILTERS.metric) p.set("metric", f.metric)
  if (f.country) p.set("country", f.country)
  if (f.country && f.compare) p.set("compare", f.compare)
  if (f.ecosystem !== null) p.set("eco", String(f.ecosystem))
  if (f.from) p.set("from", f.from)
  if (f.to) p.set("to", f.to)
  if (f.ecoSort !== DEFAULT_FILTERS.ecoSort) p.set("sort", f.ecoSort)
  if (f.cohorts.length !== COHORT_KEYS.length) p.set("cohorts", f.cohorts.join(","))
  if (f.cohortMode === "share") p.set("cmode", "share")
  return p
}

/** Paramètres d'URL gérés par les filtres de l'explorateur. */
export const FILTER_PARAM_KEYS = ["region", "metric", "country", "compare", "eco", "from", "to", "sort", "cohorts", "cmode"] as const

/**
 * Applique les filtres à une query string existante sans perdre les autres
 * paramètres (notamment « version », qui sélectionne un instantané
 * historique côté serveur). Les clés de filtre absentes sont retirées.
 */
export function mergeFilterParams(current: URLSearchParams, f: SobFilters): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const k of FILTER_PARAM_KEYS) next.delete(k)
  serializeFilters(f).forEach((v, k) => next.set(k, v))
  return next
}

export function inRegion(c: SobCountry, region: Region): boolean {
  return region === "all" || c.region === region
}

/** Valeur d'une métrique : null si absente ou invalide (jamais 0 par défaut). */
export function metricValue(c: SobCountry | undefined, metric: Metric): number | null {
  const v = c?.[metric]
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null
}

export interface CountryStats {
  iso: string
  name: string
  region: string
  value: number | null
  /** Rang dans le périmètre filtré (1 = plus élevé), null si sans valeur. */
  rank: number | null
  /** Part du total du périmètre filtré, entre 0 et 1. */
  share: number | null
  values: Record<Metric, number | null>
}

export function countryStats(map: SobCountry[], filters: Pick<SobFilters, "region" | "metric">): Map<string, CountryStats> {
  const scoped = map.filter((c) => inRegion(c, filters.region))
  const withValue = scoped
    .map((c) => ({ c, v: metricValue(c, filters.metric) }))
    .filter((x): x is { c: SobCountry; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)
  const total = withValue.reduce((s, x) => s + x.v, 0)
  const rank = new Map(withValue.map((x, i) => [x.c.iso_a3, i + 1]))
  const out = new Map<string, CountryStats>()
  for (const c of scoped) {
    const value = metricValue(c, filters.metric)
    out.set(c.iso_a3, {
      iso: c.iso_a3,
      name: c.name,
      region: c.region,
      value,
      rank: rank.get(c.iso_a3) ?? null,
      share: value !== null && total > 0 ? value / total : null,
      values: {
        commits_lifetime: metricValue(c, "commits_lifetime"),
        devs_active_28d: metricValue(c, "devs_active_28d"),
        commits_last_12m: metricValue(c, "commits_last_12m"),
      },
    })
  }
  return out
}

/** Domaine de couleur : [min > 0, max] des valeurs présentes ; null si aucune. */
export function colorDomain(stats: Map<string, CountryStats>): [number, number] | null {
  const values = [...stats.values()].map((s) => s.value).filter((v): v is number => v !== null && v > 0)
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? [min, min + 1] : [min, max]
}

/** Indices [début, fin] (inclus) de la période dans la liste des mois. */
export function monthRange(months: string[], from: string | null, to: string | null): [number, number] {
  if (!months.length) return [0, -1]
  let i = from ? months.indexOf(from) : 0
  let j = to ? months.indexOf(to) : months.length - 1
  if (i < 0) i = 0
  if (j < 0) j = months.length - 1
  return i <= j ? [i, j] : [j, i]
}

export interface EcoRow {
  id: number
  name: string
  devsRecent: number
  first: number | null
  last: number | null
  growthAbs: number | null
  growthRel: number | null
  series: (number | null)[]
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)

/**
 * Classement des écosystèmes sur la période : valeurs de début et de fin
 * observées (premier/dernier mois de la période ayant une valeur), variations
 * absolue et relative. Tri stable ; les valeurs absentes sont classées en fin.
 */
export function rankEcosystems(ecosystems: SobEcosystem[], months: string[], filters: Pick<SobFilters, "from" | "to" | "ecoSort">): EcoRow[] {
  const [i, j] = monthRange(months, filters.from, filters.to)
  const rows: EcoRow[] = ecosystems.map((e) => {
    const series = (e.series_devs ?? []).slice(i, j + 1).map(num)
    const firstIdx = series.findIndex((v) => v !== null)
    const lastIdx = series.length - 1 - [...series].reverse().findIndex((v) => v !== null)
    const first = firstIdx >= 0 ? series[firstIdx] : null
    const last = firstIdx >= 0 ? series[lastIdx] : null
    const growthAbs = first !== null && last !== null ? last - first : null
    const growthRel = first !== null && last !== null && first > 0 ? (last - first) / first : null
    return { id: e.id, name: e.name, devsRecent: num(e.devs_recent) ?? 0, first, last, growthAbs, growthRel, series }
  })
  const key: Record<EcoSort, (r: EcoRow) => number | null> = {
    devs_recent: (r) => r.devsRecent,
    growth_abs: (r) => r.growthAbs,
    growth_rel: (r) => r.growthRel,
    start: (r) => r.first,
  }
  const k = key[filters.ecoSort]
  return rows
    .map((r, idx) => ({ r, idx }))
    .sort((a, b) => {
      const va = k(a.r)
      const vb = k(b.r)
      if (va === null && vb === null) return a.idx - b.idx
      if (va === null) return 1
      if (vb === null) return -1
      return vb - va || a.idx - b.idx
    })
    .map((x) => x.r)
}

export interface CohortPoint {
  month: string
  values: Record<CohortKey, number | null>
  /** Total des catégories AFFICHÉES ayant une valeur ; null si aucune. */
  total: number | null
}

/** Séries de cohortes sur la période, catégories masquées exclues du total. */
export function cohortSeries(cohort: SobCohort, filters: Pick<SobFilters, "from" | "to" | "cohorts">): CohortPoint[] {
  const [i, j] = monthRange(cohort.months, filters.from, filters.to)
  const out: CohortPoint[] = []
  for (let k = i; k <= j; k++) {
    const values = {} as Record<CohortKey, number | null>
    let total: number | null = null
    for (const key of COHORT_KEYS) {
      const v = num(cohort[key]?.[k])
      values[key] = v
      if (filters.cohorts.includes(key) && v !== null) total = (total ?? 0) + v
    }
    out.push({ month: cohort.months[k], values, total })
  }
  return out
}

/**
 * Réduction d'une longue série pour l'affichage (conserve le premier, le
 * dernier point et les extrêmes de chaque segment). Les points affichés sont
 * tous des observations réelles : aucune valeur n'est calculée.
 */
export function downsample<T>(points: T[], max: number, value: (p: T) => number | null): T[] {
  if (points.length <= max || max < 4) return points
  const buckets = Math.floor((max - 2) / 2)
  const size = (points.length - 2) / buckets
  const out: T[] = [points[0]]
  for (let b = 0; b < buckets; b++) {
    const start = 1 + Math.floor(b * size)
    const end = Math.min(points.length - 1, 1 + Math.floor((b + 1) * size))
    let lo = -1
    let hi = -1
    for (let k = start; k < end; k++) {
      const v = value(points[k])
      if (v === null) continue
      if (lo < 0 || v < (value(points[lo]) as number)) lo = k
      if (hi < 0 || v > (value(points[hi]) as number)) hi = k
    }
    for (const k of [lo, hi].filter((x) => x >= 0).sort((a, c) => a - c)) if (out[out.length - 1] !== points[k]) out.push(points[k])
  }
  out.push(points[points.length - 1])
  return out
}
