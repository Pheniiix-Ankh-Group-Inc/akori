import "server-only"
import { getAdminClient } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/env"

export type MediaIssue =
  | "draft_object_missing"
  | "public_object_missing"
  | "public_object_orphan"
  | "draft_object_orphan"
  | "public_without_rights"

export interface MediaReportRow {
  issue: MediaIssue
  media_id: string | null
  bucket: string
  object_path: string
}

/**
 * Rapport de réconciliation media_assets ↔ Storage (RPC media_storage_report,
 * migration 0006). LECTURE SEULE : aucune suppression automatique. Les
 * corrections se font à la main depuis l'administration ou la console.
 */
export async function mediaStorageReport(): Promise<{ ok: true; rows: MediaReportRow[] } | { ok: false; error: string }> {
  if (!isSupabaseAdminConfigured()) return { ok: false, error: "Clé serveur Supabase non configurée." }
  const { data, error } = await getAdminClient().rpc("media_storage_report")
  if (error) return { ok: false, error: "Rapport indisponible." }
  return { ok: true, rows: (data ?? []) as MediaReportRow[] }
}
