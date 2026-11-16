import "server-only"
import { createHash } from "node:crypto"
import { getAdminClient } from "@/lib/supabase/admin"
import { recordIncident } from "@/lib/ops/incidents"

const SOURCE_ID = "electric-capital-osdd"
const BUCKET = "bib-sob-candidates"
const NEED = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"]

export interface CoherenceReport {
  state: "no_current" | "in_sync" | "storage_mismatch"
  version: string | null
  problems: string[]
}

/**
 * Cohérence PostgreSQL ↔ Storage de la version courante : chaque artefact
 * enregistré doit exister dans le bucket privé avec la même empreinte SHA-256.
 * Journalise le contrôle (ingestion_runs « reconcile ») et crée un incident
 * critique en cas d'écart. La copie technique du dépôt est contrôlée par le
 * workflow (publish_supabase.py reconcile).
 */
export async function checkSobCoherence(trigger: "manual" | "schedule" = "manual"): Promise<CoherenceReport> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("dataset_versions")
    .select("id, provider_version, dataset_artifacts(name, storage_path, sha256)")
    .eq("source_id", SOURCE_ID)
    .eq("is_current", true)
    .maybeSingle()
  const cur = data as { id: string; provider_version: string; dataset_artifacts: { name: string; storage_path: string; sha256: string }[] | null } | null
  if (!cur) return { state: "no_current", version: null, problems: [] }
  const arts = new Map((cur.dataset_artifacts ?? []).map((a) => [a.name, a]))
  const problems: string[] = []
  for (const name of NEED) {
    const a = arts.get(name)
    if (!a) {
      problems.push(`${name} : artefact absent de PostgreSQL`)
      continue
    }
    const { data: blob, error } = await admin.storage.from(BUCKET).download(a.storage_path)
    if (error || !blob) {
      problems.push(`${name} : objet absent de Storage`)
      continue
    }
    const hash = createHash("sha256").update(Buffer.from(await blob.arrayBuffer())).digest("hex")
    if (hash !== a.sha256) problems.push(`${name} : SHA-256 Storage différent de PostgreSQL`)
  }
  const state = problems.length ? "storage_mismatch" : "in_sync"
  await admin.from("ingestion_runs").insert({
    source_id: SOURCE_ID,
    dataset_version_id: cur.id,
    kind: "reconcile",
    trigger,
    status: problems.length ? "failed" : "succeeded",
    finished_at: new Date().toISOString(),
    message: `${cur.provider_version} : ${state} (contrôle administration)`,
    details: { state, storage: problems.slice(0, 10), scope: "postgres+storage" },
  })
  if (problems.length) {
    await recordIncident({ kind: "sob.desync", severity: "critical", message: `State of BIB ${cur.provider_version} : artefacts Storage incohérents avec PostgreSQL`, details: { problems: problems.slice(0, 10) } })
  }
  return { state, version: cur.provider_version, problems }
}
