import "server-only"
import { createHash } from "node:crypto"
import { getAdminClient } from "@/lib/supabase/admin"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
import type { SobSnapshot, SobState } from "@/lib/sob/load"
import type { SobFiles } from "@/lib/sob/validity"
import { INTEGRITY_COLUMNS, isVerifiedVersion, type VersionIntegrityRow } from "@/lib/sob/version-integrity"

const SOURCE_ID = "electric-capital-osdd"
const BUCKET = "bib-sob-candidates"
const FILES = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"] as const
const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

type Artifact = { name: string; storage_path: string; sha256: string }
type DatasetRow = {
  id: string
  provider_version: string
  status: string
  as_of_date: string | null
  published_at: string | null
  is_current: boolean
}

export type SobVersion = Pick<DatasetRow, "provider_version" | "as_of_date" | "published_at" | "is_current">

export async function listSobVersions(): Promise<SobVersion[]> {
  if (!env.flags.sobReadFromSupabase || !isSupabaseAdminConfigured()) return []
  const { data, error } = await getAdminClient()
    .from("dataset_versions")
    .select(`provider_version,as_of_date,is_current,${INTEGRITY_COLUMNS}`)
    .eq("source_id", SOURCE_ID)
    .in("status", ["published", "superseded"])
    .order("as_of_date", { ascending: false })
    .limit(250)
  if (error) throw new Error("Unable to list State of BIB versions")
  // Seules les versions passées par le circuit complet sont proposées.
  return ((data ?? []) as unknown as (SobVersion & VersionIntegrityRow)[])
    .filter(isVerifiedVersion)
    .map(({ provider_version, as_of_date, published_at, is_current }) => ({ provider_version, as_of_date, published_at, is_current }))
}

/** Historical queries never contact the external provider or read repository JSON. */
export async function loadSobVersion(version: string): Promise<SobState> {
  const unavailable = (reason: string): SobState => ({ origin: "unavailable", reason, problems: [] })
  if (!VERSION_PATTERN.test(version)) return unavailable("invalid version identifier")
  if (!env.flags.sobReadFromSupabase || !isSupabaseAdminConfigured()) return unavailable("Supabase unavailable")
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("dataset_versions")
    .select(`id,provider_version,${INTEGRITY_COLUMNS},dataset_artifacts(name,storage_path,sha256)`)
    .eq("source_id", SOURCE_ID)
    .eq("provider_version", version)
    .in("status", ["published", "superseded"])
    .maybeSingle()
  if (error || !data) return unavailable("historical version not found")
  if (!isVerifiedVersion(data as unknown as VersionIntegrityRow)) return unavailable("historical version not verified")
  const arts = new Map(((data.dataset_artifacts ?? []) as Artifact[]).map(a => [a.name, a]))
  if (!FILES.every(name => arts.has(name))) return unavailable("historical artifacts incomplete")
  try {
    const values = await Promise.all(FILES.map(async name => {
      const art = arts.get(name)!
      const { data: object, error: storageError } = await admin.storage.from(BUCKET).download(art.storage_path)
      if (storageError || !object) throw new Error("artifact unavailable")
      const raw = await object.text()
      if (createHash("sha256").update(raw, "utf8").digest("hex") !== art.sha256) throw new Error("artifact integrity mismatch")
      return JSON.parse(raw)
    }))
    const [meta, headline, countryMap, topCities, ecoMix, cohort] = values
    if (String(meta?.dataset_version) !== data.provider_version) return unavailable("version mismatch")
    return {
      meta, headline, countryMap, topCities, ecoMix, cohort,
      origin: "supabase", version: data.provider_version, publishedAt: data.published_at,
    } as SobSnapshot & SobFiles
  } catch {
    return unavailable("historical dataset integrity check failed")
  }
}

export interface SobDelta {
  metric_key: string
  previous_value: number | null
  current_value: number | null
  delta: number | null
  relative_change: number | null
  change_kind: "added" | "removed" | "changed"
}

/** Stored comparisons of the selected version against its predecessor. */
export async function loadSobDeltas(version: string): Promise<SobDelta[]> {
  if (!VERSION_PATTERN.test(version) || !env.flags.sobReadFromSupabase || !isSupabaseAdminConfigured()) return []
  const admin = getAdminClient()
  const { data: row, error } = await admin.from("dataset_versions")
    .select("id")
    .eq("source_id", SOURCE_ID)
    .eq("provider_version", version)
    .in("status", ["published", "superseded"])
    .maybeSingle()
  if (error || !row) return []
  const { data, error: deltaError } = await admin.from("dataset_version_deltas")
    .select("metric_key,previous_value,current_value,delta,relative_change,change_kind")
    .eq("dataset_version_id", row.id)
    .eq("dimension_type", "total")
    .order("metric_key")
  if (deltaError) return []
  return (data ?? []) as SobDelta[]
}
