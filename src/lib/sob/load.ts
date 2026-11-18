import "server-only"
import { unstable_cache } from "next/cache"
import { createHash } from "node:crypto"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import type {
  SobCity,
  SobCohort,
  SobCountry,
  SobEcosystemMix,
  SobHeadline,
  SobMeta,
} from "@/components/state-of-bib/types"

import { fallbackProblems, snapshotProblems, type SobFiles } from "@/lib/sob/validity"

// Copie technique interne (hors de public/, jamais servie telle quelle).
import metaData from "../../../data/state-of-bib/current/meta.json"
import headlineData from "../../../data/state-of-bib/current/headline.json"
import countryMapData from "../../../data/state-of-bib/current/country_map.json"
import topCitiesData from "../../../data/state-of-bib/current/top_cities.json"
import ecoMixData from "../../../data/state-of-bib/current/ecosystem_mix.json"
import cohortData from "../../../data/state-of-bib/current/tenure_cohort.json"

export const SOB_TAG = "state-of-bib"

export interface SobSnapshot extends SobFiles {
  /** "supabase" : version courante publiée ; "fallback" : copie technique valide. */
  origin: "supabase" | "fallback"
  /** Version logique (dataset_versions.provider_version ou meta.dataset_version). */
  version: string
  publishedAt?: string | null
}

/** Raison d'une indisponibilité (affichée dans l'administration, jamais au public). */
export interface SobUnavailable {
  origin: "unavailable"
  reason: string
  problems: string[]
}

export type SobState = SobSnapshot | SobUnavailable

export const isSobAvailable = (s: SobState): s is SobSnapshot => s.origin !== "unavailable"

const repoCopy: SobFiles = {
  meta: metaData as SobMeta,
  headline: headlineData as SobHeadline,
  countryMap: countryMapData as SobCountry[],
  topCities: topCitiesData as SobCity[],
  ecoMix: ecoMixData as SobEcosystemMix,
  cohort: cohortData as SobCohort,
}

const SOURCE_ID = "electric-capital-osdd"
const CANDIDATE_BUCKET = "bib-sob-candidates"
const NEED = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"] as const

type Artifact = { name: string; storage_path: string; sha256: string }

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

/**
 * Copie de test (E2E uniquement) : SOB_E2E_FIXTURE_DIR désigne un dossier de
 * fixtures lu côté serveur. Elle passe par les mêmes contrôles de validité que
 * la copie du dépôt ; la variable n'est jamais définie en production.
 */
async function fixtureCopy(): Promise<SobFiles | null> {
  const dir = process.env.SOB_E2E_FIXTURE_DIR
  if (!dir) return null
  const { readFile } = await import("node:fs/promises")
  const path = await import("node:path")
  const read = async (n: string) => JSON.parse(await readFile(path.join(dir, n), "utf8"))
  const [meta, headline, countryMap, topCities, ecoMix, cohort] = await Promise.all(NEED.map(read))
  return { meta, headline, countryMap, topCities, ecoMix, cohort }
}

/**
 * Repli : la copie technique n'est utilisée QUE si elle est cohérente, de
 * provenance connue et récente. Sinon : indisponibilité explicite — aucun
 * chiffre non fiable n'est affiché et l'erreur n'est pas masquée.
 */
async function fallback(reason: string): Promise<SobState> {
  if (process.env.NODE_ENV === "production") {
    return { origin: "unavailable", reason, problems: [] }
  }
  let files = repoCopy
  try {
    files = (await fixtureCopy()) ?? repoCopy
  } catch (e) {
    return { origin: "unavailable", reason, problems: [`fixture illisible : ${(e as Error).message}`] }
  }
  const problems = fallbackProblems(files)
  if (problems.length) {
    console.error(`[state-of-bib] ${reason} ; copie de repli refusée : ${problems.slice(0, 3).join(" ; ")}`)
    return { origin: "unavailable", reason, problems }
  }
  return { ...files, origin: "fallback", version: String(files.meta.dataset_version) }
}

/**
 * Lit un artefact de la version courante dans le bucket PRIVÉ, côté serveur
 * (clé de service), et vérifie son empreinte SHA-256. Aucun artefact complet
 * n'est exposé par une URL publique.
 */
async function readArtifact(a: Artifact): Promise<unknown> {
  const { data, error } = await getAdminClient().storage.from(CANDIDATE_BUCKET).download(a.storage_path)
  if (error || !data) throw new Error(`artefact ${a.name} illisible`)
  const text = await data.text()
  if (sha256Hex(text) !== a.sha256) throw new Error(`artefact ${a.name}: empreinte SHA-256 différente`)
  return JSON.parse(text)
}

/**
 * État State of BIB courant. Source primaire : Supabase (version « courante »
 * de dataset_versions, artefacts privés vérifiés par SHA-256 et recontrôlés).
 * FEATURE_SOB_READ_FROM_SUPABASE=false force le repli (diagnostic).
 */
export async function loadSobStateUncached(): Promise<SobState> {
    if (!env.flags.sobReadFromSupabase) return fallback("lecture Supabase désactivée")
    if (!isSupabaseAdminConfigured()) return fallback("Supabase non configuré côté serveur")
    try {
      const { data, error } = await getAdminClient()
        .from("dataset_versions")
        .select("id, provider_version, published_at, dataset_artifacts(name, storage_path, sha256)")
        .eq("source_id", SOURCE_ID)
        .eq("is_current", true)
        .maybeSingle()
      if (error) return fallback(`lecture de la version courante impossible (${error.code ?? "erreur"})`)
      if (!data) return fallback("aucune version publiée")
      const row = data as { provider_version: string; published_at: string | null; dataset_artifacts: Artifact[] | null }
      const arts = new Map((row.dataset_artifacts ?? []).map((a) => [a.name, a]))
      if (!NEED.every((n) => arts.get(n)?.sha256)) return fallback("artefacts incomplets pour la version courante")
      const [meta, headline, countryMap, topCities, ecoMix, cohort] = (await Promise.all(NEED.map((n) => readArtifact(arts.get(n)!)))) as [
        SobMeta,
        SobHeadline,
        SobCountry[],
        SobCity[],
        SobEcosystemMix,
        SobCohort,
      ]
      const files: SobFiles = { meta, headline, countryMap, topCities, ecoMix, cohort }
      // Ensemble cohérent ou rien : même version annoncée partout, mêmes
      // contrôles qu'à l'ingestion.
      if (String((meta as { dataset_version?: unknown }).dataset_version ?? "") !== row.provider_version) {
        return fallback("artefacts d'une autre version que la version courante")
      }
      // Variations statistiques conservées telles quelles, sans recalcul ni rejet.
      const problems = snapshotProblems(files)
      if (problems.length) console.warn("[state-of-bib] observations statistiques :", problems.slice(0, 5))
      return { ...files, origin: "supabase", version: row.provider_version, publishedAt: row.published_at }
    } catch (e) {
      return fallback(`lecture Supabase impossible (${(e as Error).message})`)
    }
}

/** Public cache. Do not use to verify post-publication database state. */
export const loadSobState = unstable_cache(
  loadSobStateUncached,
  ["sob-state-v3"],
  // Invalidation explicite après chaque publication (/api/cron/sob-refresh) ;
  // l'expiration de 15 minutes est un filet de sécurité si cet appel échoue.
  { tags: [SOB_TAG], revalidate: 900 },
)

export interface SobTrendPoint {
  as_of_date: string
  value: number
}

/** Série historique d'un indicateur total (versions publiées uniquement). */
export const loadSobTrend = unstable_cache(
  async (metricKey: string): Promise<SobTrendPoint[]> => {
    if (!env.flags.sobReadFromSupabase) return []
    if (!isSupabaseAdminConfigured()) return []
    // Lecture serveur, versions publiées uniquement (jamais une candidate).
    const { data } = await getAdminClient()
      .from("metric_observations")
      .select("as_of_date, value, dataset_versions!inner(status)")
      .in("dataset_versions.status", ["published", "superseded"])
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
  { tags: [SOB_TAG], revalidate: 900 },
)
