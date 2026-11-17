import "server-only"
import { createClient } from "@/lib/supabase/server"
import { DRAFT_BUCKET } from "./publication"

/** URL signée (10 minutes) d'un média en brouillon, pour l'aperçu éditeur. */
export async function createDraftPreviewUrl(mediaId: string, expiresIn = 600): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("media_assets").select("draft_path").eq("id", mediaId).maybeSingle()
  const path = (data as { draft_path: string } | null)?.draft_path
  if (!path) return null
  const { data: signed } = await supabase.storage.from(DRAFT_BUCKET).createSignedUrl(path, expiresIn)
  return signed?.signedUrl ?? null
}

export async function createDraftPreviewUrls(mediaIds: string[], expiresIn = 600): Promise<Record<string, string>> {
  const ids = [...new Set(mediaIds.filter(Boolean))]
  if (!ids.length) return {}
  const supabase = await createClient()
  const { data } = await supabase.from("media_assets").select("id, draft_path").in("id", ids)
  const rows = (data ?? []) as { id: string; draft_path: string }[]
  if (!rows.length) return {}
  const { data: signed } = await supabase.storage.from(DRAFT_BUCKET).createSignedUrls(rows.map((r) => r.draft_path), expiresIn)
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return Object.fromEntries(rows.map((r) => [r.id, byPath.get(r.draft_path) ?? ""]).filter(([, u]) => u))
}
