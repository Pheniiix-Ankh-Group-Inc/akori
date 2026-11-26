/**
 * Intégrité des versions historiques du State of BIB.
 *
 * Une version n'est présentée comme publiée (sélecteur, frise, tendance,
 * consultation `?version=`) que si elle a suivi le circuit complet :
 * traitée par un pipeline identifié, empreinte source enregistrée, décision
 * de publication datée, date de publication renseignée.
 *
 * Cas connu : 20260419T130333 (as_of 2026-04-18) a été importée lors de la
 * reprise de l'historique, sans pipeline_version, sans empreinte, sans
 * décision ni date de publication, puis marquée « superseded ». Elle reste
 * archivée (jamais supprimée) et sert de base aux écarts stockés de la
 * version suivante, mais n'est pas présentée comme une version vérifiée.
 */
export interface VersionIntegrityRow {
  status: string
  published_at: string | null
  decided_at: string | null
  pipeline_version: string | null
  source_fingerprint: string | null
}

export type VersionIntegrityIssue = "not_published_status" | "never_published" | "no_decision" | "no_pipeline" | "no_fingerprint"

export function versionIntegrityIssues(v: VersionIntegrityRow): VersionIntegrityIssue[] {
  const issues: VersionIntegrityIssue[] = []
  if (v.status !== "published" && v.status !== "superseded") issues.push("not_published_status")
  if (!v.published_at) issues.push("never_published")
  if (!v.decided_at) issues.push("no_decision")
  if (!v.pipeline_version) issues.push("no_pipeline")
  if (!v.source_fingerprint) issues.push("no_fingerprint")
  return issues
}

export const isVerifiedVersion = (v: VersionIntegrityRow): boolean => versionIntegrityIssues(v).length === 0

/** Colonnes à sélectionner pour évaluer l'intégrité. */
export const INTEGRITY_COLUMNS = "status,published_at,decided_at,pipeline_version,source_fingerprint"
