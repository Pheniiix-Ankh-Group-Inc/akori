import "server-only"
import { getAdminClient } from "@/lib/supabase/admin"

export const DRAFT_BUCKET = "bib-media-drafts"
export const PUBLIC_BUCKET = "bib-media-public"
export const CONSENT_BUCKET = "bib-consents"

/**
 * Publication des médias. Les fichiers importés restent dans le bucket privé ;
 * à la publication d'un contenu, chaque média approuvé est COPIÉ vers le
 * bucket public. Au retrait, la copie publique est supprimée si plus aucun
 * contenu publié ne l'utilise. Appelé uniquement après requireEditor().
 */

interface MediaRow {
  id: string
  kind: string
  alt_text: Record<string, string> | null
  draft_path: string
  public_path: string | null
  rights_status: string
  rights_reference: string | null
  poster_media_id: string | null
  subtitles_media_id: string | null
}

export async function publishMedia(mediaIds: string[]): Promise<{ published: string[]; refused: string[] }> {
  const ids = [...new Set(mediaIds.filter(Boolean))]
  if (ids.length === 0) return { published: [], refused: [] }
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("media_assets")
    .select("id, kind, alt_text, draft_path, public_path, rights_status, rights_reference, poster_media_id, subtitles_media_id")
    .in("id", ids)
  if (error || !data) throw new Error("Lecture des médias impossible.")

  const published: string[] = []
  const refused: string[] = []
  const rows = data as MediaRow[]

  // Les affiches et sous-titres d'une vidéo suivent la vidéo.
  const companions = rows.flatMap((r) => [r.poster_media_id, r.subtitles_media_id]).filter((x): x is string => !!x && !ids.includes(x))
  if (companions.length) {
    const extra = await publishMedia(companions)
    published.push(...extra.published)
    refused.push(...extra.refused)
  }

  for (const m of rows) {
    const needsAlt = m.kind === "image" || m.kind === "poster"
    const hasAlt = !!m.alt_text && Object.values(m.alt_text).some((v) => v && v.trim().length > 0)
    if (m.rights_status !== "approved" || !m.rights_reference || (needsAlt && !hasAlt)) {
      refused.push(m.id)
      continue
    }
    if (m.public_path) {
      published.push(m.id)
      continue
    }
    const publicPath = `published/${m.id}/${m.draft_path.split("/").pop()}`
    const { error: copyError } = await admin.storage
      .from(DRAFT_BUCKET)
      .copy(m.draft_path, publicPath, { destinationBucket: PUBLIC_BUCKET })
    if (copyError) throw new Error(`Copie publique impossible pour le média ${m.id}.`)
    const { error: updError } = await admin.from("media_assets").update({ public_path: publicPath }).eq("id", m.id)
    if (updError) throw new Error(`Mise à jour du média ${m.id} impossible.`)
    published.push(m.id)
  }
  return { published, refused }
}

/** Le média est-il encore utilisé par un contenu publié ? */
async function isMediaInPublishedUse(mediaId: string): Promise<boolean> {
  const admin = getAdminClient()
  const checks = await Promise.all([
    admin.from("events").select("id", { count: "exact", head: true }).eq("status", "published").eq("cover_media_id", mediaId),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "published").or(`cover_media_id.eq.${mediaId},featured_video_id.eq.${mediaId}`),
    admin.from("story_media").select("story_id, stories!inner(status)", { count: "exact", head: true }).eq("media_id", mediaId).eq("stories.status", "published"),
    admin.from("media_assets").select("id", { count: "exact", head: true }).not("public_path", "is", null).or(`poster_media_id.eq.${mediaId},subtitles_media_id.eq.${mediaId}`),
  ])
  return checks.some((c) => (c.count ?? 0) > 0)
}

/** Supprime les copies publiques devenues inutilisées (retrait, archivage). */
export async function retractUnusedMedia(mediaIds: string[]): Promise<string[]> {
  const admin = getAdminClient()
  const removed: string[] = []
  for (const id of [...new Set(mediaIds.filter(Boolean))]) {
    if (await isMediaInPublishedUse(id)) continue
    const { data } = await admin.from("media_assets").select("public_path").eq("id", id).maybeSingle()
    const path = (data as { public_path: string | null } | null)?.public_path
    if (!path) continue
    const { error } = await admin.storage.from(PUBLIC_BUCKET).remove([path])
    if (error) throw new Error(`Retrait du fichier public impossible pour le média ${id}.`)
    await admin.from("media_assets").update({ public_path: null }).eq("id", id)
    removed.push(id)
  }
  return removed
}

/** Retrait immédiat d'un média (droits révoqués) : copie publique supprimée. */
export async function forceRetractMedia(mediaId: string): Promise<void> {
  const admin = getAdminClient()
  const { data } = await admin.from("media_assets").select("public_path").eq("id", mediaId).maybeSingle()
  const path = (data as { public_path: string | null } | null)?.public_path
  if (path) {
    const { error } = await admin.storage.from(PUBLIC_BUCKET).remove([path])
    if (error) throw new Error("Retrait du fichier public impossible.")
  }
  await admin.from("media_assets").update({ public_path: null }).eq("id", mediaId)
}
