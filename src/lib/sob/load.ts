import "server-only"
import { unstable_cache } from "next/cache"
import { env } from "@/lib/env"
import { getPublicClient, publicSnapshotUrl } from "@/lib/supabase/public"
import type {
  SobCity,
  SobCohort,
  SobCountry,
  SobEcosystemMix,
  SobHeadline,
  SobMeta,
} from "@/components/state-of-bib/types"

import metaData from "../../../public/data/meta.json"
import headlineData from "../../../public/data/headline.json"
import countryMapData from "../../../public/data/country_map.json"
import topCitiesData from "../../../public/data/top_cities.json"
import ecoMixData from "../../../public/data/ecosystem_mix.json"
import cohortData from "../../../public/data/tenure_cohort.json"

export const SOB_TAG = "state-of-bib"

export interface SobSnapshot {
  origin: "supabase" | "bundled"
  meta: SobMeta
  headline: SobHeadline
  countryMap: SobCountry[]
  topCities: SobCity[]
  ecoMix: SobEcosystemMix
  cohort: SobCohort
}

const bundled: SobSnapshot = {
  origin: "bundled",
  meta: metaData as SobMeta,
  headline: headlineData as SobHeadline,
  countryMap: countryMapData as SobCountry[],
  topCities: topCitiesData as SobCity[],
  ecoMix: ecoMixData as SobEcosystemMix,
  cohort: cohortData as SobCohort,
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = publicSnapshotUrl(path)
  if (!url) throw new Error("Supabase non configuré")
  const res = await fetch(url, { next: { revalidate: 3600, tags: [SOB_TAG] } })
  if (!res.ok) throw new Error(`snapshot ${path}: HTTP ${res.status}`)
  return (await res.json()) as T
}

/**
 * Dernier snapshot State of BIB publié.
 * - Si FEATURE_SOB_READ_FROM_SUPABASE=true : lit la version « courante » dans
 *   Supabase et ses fichiers immuables dans Storage.
 * - Sinon, ou en cas d'erreur : JSON embarqués (public/data), qui restent la
 *   dernière version valide connue. La page ne casse jamais.
 */
export const loadSobSnapshot = unstable_cache(
  async (): Promise<SobSnapshot> => {
    if (!env.flags.sobReadFromSupabase) return bundled
    const supabase = getPublicClient()
    if (!supabase) return bundled
    try {
      const { data, error } = await supabase
        .from("dataset_versions")
        .select("id, provider_version, dataset_artifacts(name, storage_path)")
        .eq("source_id", "electric-capital-osdd")
        .eq("is_current", true)
        .maybeSingle()
      if (error || !data) return bundled
      const arts = Object.fromEntries(
        ((data as { dataset_artifacts: { name: string; storage_path: string }[] }).dataset_artifacts ?? []).map((a) => [a.name, a.storage_path]),
      )
      const need = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"]
      if (!need.every((n) => arts[n])) return bundled
      const [meta, headline, countryMap, topCities, ecoMix, cohort] = await Promise.all([
        fetchJson<SobMeta>(arts["meta.json"]),
        fetchJson<SobHeadline>(arts["headline.json"]),
        fetchJson<SobCountry[]>(arts["country_map.json"]),
        fetchJson<SobCity[]>(arts["top_cities.json"]),
        fetchJson<SobEcosystemMix>(arts["ecosystem_mix.json"]),
        fetchJson<SobCohort>(arts["tenure_cohort.json"]),
      ])
      if (!Array.isArray(countryMap) || !Array.isArray(topCities) || typeof headline?.devs_active_28d !== "number") return bundled
      return { origin: "supabase", meta, headline, countryMap, topCities, ecoMix, cohort }
    } catch (e) {
      console.error("[state-of-bib] lecture Supabase impossible, repli sur les JSON embarqués", (e as Error).message)
      return bundled
    }
  },
  ["sob-snapshot-v1"],
  { tags: [SOB_TAG], revalidate: 3600 },
)

export interface SobTrendPoint {
  as_of_date: string
  value: number
}

/** Série historique d'un indicateur total (versions publiées uniquement). */
export const loadSobTrend = unstable_cache(
  async (metricKey: string): Promise<SobTrendPoint[]> => {
    if (!env.flags.sobReadFromSupabase) return []
    const supabase = getPublicClient()
    if (!supabase) return []
    const { data } = await supabase
      .from("metric_observations")
      .select("as_of_date, value")
      .eq("metric_key", metricKey)
      .eq("dimension_type", "total")
      .order("as_of_date", { ascending: true })
      .limit(1000)
    // Une observation par date de référence : jamais de points dupliqués.
    const byDate = new Map<string, number>()
    for (const r of (data ?? []) as SobTrendPoint[]) byDate.set(r.as_of_date, Number(r.value))
    return [...byDate.entries()].map(([as_of_date, value]) => ({ as_of_date, value }))
  },
  ["sob-trend-v1"],
  { tags: [SOB_TAG], revalidate: 3600 },
)
