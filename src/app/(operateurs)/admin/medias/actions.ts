"use server"

import { randomUUID } from "node:crypto"
import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { CONSENT_LIMITS, MEDIA_LIMITS } from "@/lib/stories/types"
import { CONSENT_BUCKET, DRAFT_BUCKET, forceRetractMedia } from "@/lib/media/publication"
import { MEDIA_TAG } from "@/lib/events/queries"
import { STORIES_TAG } from "@/lib/stories/queries"
import { CONTENT_LOCALES } from "@/lib/content/locales"

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "text/vtt": "vtt",
  "application/pdf": "pdf",
}

const ticketSchema = z.object({
  kind: z.enum(["image", "video", "poster", "subtitles"]),
  mimeType: z.string(),
  size: z.number().int().positive(),
})

export type UploadTicket = { ok: true; path: string; token: string; bucket: string } | { ok: false; error: string }

/**
 * Étape 1 de l'import : contrôle du type et de la taille, puis URL signée
 * d'envoi dans le bucket PRIVÉ des brouillons (aucune URL publique).
 */
export async function createUploadTicket(input: z.infer<typeof ticketSchema>): Promise<UploadTicket> {
  await requireEditor()
  const parsed = ticketSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Demande d'import invalide." }
  const { kind, mimeType, size } = parsed.data
  const limits = MEDIA_LIMITS[kind]
  if (!limits.mimes.includes(mimeType)) return { ok: false, error: `Type de fichier refusé pour « ${kind} » : ${mimeType}.` }
  if (size > limits.maxBytes) return { ok: false, error: `Fichier trop volumineux (max ${Math.round(limits.maxBytes / 1048576)} Mo).` }

  const now = new Date()
  const path = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${EXT[mimeType]}`
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(DRAFT_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: "Préparation de l'import impossible." }
  return { ok: true, path, token: data.token, bucket: DRAFT_BUCKET }
}

const registerSchema = z.object({
  kind: z.enum(["image", "video", "poster", "subtitles"]),
  path: z.string().regex(/^uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif|mp4|vtt)$/),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
})

/** Étape 2 : vérifie l'objet réellement stocké puis enregistre le média. */
export async function registerUploadedMedia(input: z.infer<typeof registerSchema>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const editor = await requireEditor()
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enregistrement invalide." }
  const v = parsed.data
  const supabase = await createClient()

  const { data: info, error: infoError } = await supabase.storage.from(DRAFT_BUCKET).info(v.path)
  if (infoError || !info) return { ok: false, error: "Fichier introuvable après l'envoi." }
  const mime = info.contentType ?? ""
  const limits = MEDIA_LIMITS[v.kind]
  if (!limits.mimes.includes(mime) || !info.size || info.size > limits.maxBytes) {
    await supabase.storage.from(DRAFT_BUCKET).remove([v.path])
    return { ok: false, error: "Fichier refusé (type ou taille non conformes)." }
  }

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      kind: v.kind,
      draft_path: v.path,
      mime_type: mime,
      size_bytes: info.size,
      width: v.width ?? null,
      height: v.height ?? null,
      duration_seconds: v.durationSeconds ?? null,
      created_by: editor.id,
    })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: "Enregistrement du média impossible." }
  await logAudit(supabase, editor.id, "media.upload", "media", data.id as string, { kind: v.kind })
  return { ok: true, id: data.id as string }
}

const rightsSchema = z.object({
  id: z.uuid(),
  credit: z.string().trim().max(200),
  rights_holder: z.string().trim().max(200),
  rights_reference: z.string().trim().max(300),
  rights_status: z.enum(["pending", "approved", "rejected", "revoked"]),
  poster_media_id: z.string(),
  subtitles_media_id: z.string(),
})

/** Métadonnées, textes alternatifs et droits. Une révocation retire le fichier public. */
export async function saveMediaDetails(formData: FormData) {
  const editor = await requireEditor()
  const parsed = rightsSchema.safeParse({
    id: formData.get("id"),
    credit: formData.get("credit") ?? "",
    rights_holder: formData.get("rights_holder") ?? "",
    rights_reference: formData.get("rights_reference") ?? "",
    rights_status: formData.get("rights_status"),
    poster_media_id: formData.get("poster_media_id") ?? "",
    subtitles_media_id: formData.get("subtitles_media_id") ?? "",
  })
  if (!parsed.success) redirect(`/admin/medias?error=${encodeURIComponent("Formulaire invalide.")}`)
  const v = parsed.data
  const go = (q: string) => redirect(`/admin/medias/${v.id}?${q}`)

  if (v.rights_status === "approved" && !v.rights_reference) {
    go(`error=${encodeURIComponent("Une référence d'autorisation est obligatoire pour approuver les droits.")}`)
  }
  const alt: Record<string, string> = {}
  for (const l of CONTENT_LOCALES) {
    const a = String(formData.get(`alt_${l}`) ?? "").trim().slice(0, 500)
    if (a) alt[l] = a
  }
  const optId = (s: string) => (z.uuid().safeParse(s).success ? s : null)

  // Droits retirés : on supprime d'abord la copie publique.
  if (v.rights_status !== "approved") {
    try {
      await forceRetractMedia(v.id)
    } catch (e) {
      go(`error=${encodeURIComponent((e as Error).message)}`)
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("media_assets")
    .update({
      alt_text: alt,
      credit: v.credit || null,
      rights_holder: v.rights_holder || null,
      rights_reference: v.rights_reference || null,
      rights_status: v.rights_status,
      poster_media_id: optId(v.poster_media_id),
      subtitles_media_id: optId(v.subtitles_media_id),
    })
    .eq("id", v.id)
  if (error) go(`error=${encodeURIComponent("Enregistrement impossible.")}`)
  await logAudit(supabase, editor.id, `media.rights_${v.rights_status}`, "media", v.id)
  updateTag(MEDIA_TAG)
  updateTag(STORIES_TAG)
  go("saved=1")
}

/** URL signée d'envoi d'une preuve d'autorisation (bucket privé). */
export async function createConsentUploadTicket(input: { mediaId: string; mimeType: string; size: number }): Promise<UploadTicket> {
  await requireEditor()
  if (!z.uuid().safeParse(input.mediaId).success) return { ok: false, error: "Média invalide." }
  if (!CONSENT_LIMITS.mimes.includes(input.mimeType) || input.size > CONSENT_LIMITS.maxBytes) {
    return { ok: false, error: "Preuve refusée : PDF, JPEG ou PNG de 10 Mo maximum." }
  }
  const path = `media/${input.mediaId}/${randomUUID()}.${EXT[input.mimeType]}`
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(CONSENT_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: "Préparation de l'envoi impossible." }
  return { ok: true, path, token: data.token, bucket: CONSENT_BUCKET }
}

export async function attachConsentProof(input: { mediaId: string; path: string }): Promise<{ ok: boolean; error?: string }> {
  const editor = await requireEditor()
  if (!z.uuid().safeParse(input.mediaId).success || !input.path.startsWith(`media/${input.mediaId}/`)) {
    return { ok: false, error: "Preuve invalide." }
  }
  const supabase = await createClient()
  const { data: exists } = await supabase.storage.from(CONSENT_BUCKET).exists(input.path)
  if (!exists) return { ok: false, error: "Fichier de preuve introuvable." }
  const { error } = await supabase.from("media_assets").update({ consent_proof_path: input.path }).eq("id", input.mediaId)
  if (error) return { ok: false, error: "Enregistrement de la preuve impossible." }
  await logAudit(supabase, editor.id, "media.consent_attached", "media", input.mediaId)
  return { ok: true }
}

/** Suppression d'un média non utilisé (fichier privé + éventuelle copie publique). */
export async function deleteMediaAction(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!z.uuid().safeParse(id).success) redirect("/admin/medias?error=invalid")
  const supabase = await createClient()
  const [{ count: inStories }, { count: asCover }, { count: asEventCover }] = await Promise.all([
    supabase.from("story_media").select("media_id", { count: "exact", head: true }).eq("media_id", id),
    supabase.from("stories").select("id", { count: "exact", head: true }).or(`cover_media_id.eq.${id},featured_video_id.eq.${id}`),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("cover_media_id", id),
  ])
  if ((inStories ?? 0) + (asCover ?? 0) + (asEventCover ?? 0) > 0) {
    redirect(`/admin/medias/${id}?error=${encodeURIComponent("Ce média est encore utilisé par un contenu.")}`)
  }
  const { data } = await supabase.from("media_assets").select("draft_path, consent_proof_path").eq("id", id).single()
  try {
    await forceRetractMedia(id)
  } catch (e) {
    redirect(`/admin/medias/${id}?error=${encodeURIComponent((e as Error).message)}`)
  }
  const row = data as { draft_path: string; consent_proof_path: string | null } | null
  if (row?.draft_path) await supabase.storage.from(DRAFT_BUCKET).remove([row.draft_path])
  if (row?.consent_proof_path) await supabase.storage.from(CONSENT_BUCKET).remove([row.consent_proof_path])
  const { error } = await supabase.from("media_assets").delete().eq("id", id)
  if (error) redirect(`/admin/medias/${id}?error=${encodeURIComponent("Suppression impossible.")}`)
  await logAudit(supabase, editor.id, "media.delete", "media", id)
  updateTag(MEDIA_TAG)
  redirect("/admin/medias?deleted=1")
}
