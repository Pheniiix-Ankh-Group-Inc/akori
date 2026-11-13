"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { editorialErrorMessage, expectedUpdatedAt } from "@/lib/editorial/rpc"
import { parseStoryForm, parseStoryMediaForm } from "@/lib/stories/form"
import { STORIES_TAG, TESTIMONIALS_TAG } from "@/lib/stories/queries"
import { MEDIA_TAG } from "@/lib/events/queries"
import { publishMedia, retractUnusedMedia } from "@/lib/media/publication"

export interface FormState {
  error?: string
  issues?: string[]
}

const idSchema = z.uuid()

function invalidate() {
  updateTag(STORIES_TAG)
  updateTag(TESTIMONIALS_TAG)
  updateTag(MEDIA_TAG)
}

const back = (id: string, q: string) => redirect(`/admin/en-action/${id}?${q}`)

/**
 * Enregistrement atomique de la fiche et de ses traductions (RPC save_story),
 * avec contrôle de modification concurrente. Rétrospective publiée : les
 * nouveaux médias de couverture sont validés et copiés AVANT la mutation.
 */
export async function saveStory(_: FormState, formData: FormData): Promise<FormState> {
  await requireEditor()
  const parsed = parseStoryForm(formData)
  if (!parsed.success) return { error: "Le formulaire contient des erreurs.", issues: parsed.error.issues.map((i) => i.message) }
  const v = parsed.data
  const supabase = await createClient()

  const row = {
    slug: v.slug,
    occurred_on: v.occurred_on ?? null,
    event_id: v.event_id ?? null,
    cover_media_id: v.cover_media_id ?? null,
    featured_video_id: v.featured_video_id ?? null,
  }

  const precopied: string[] = []
  if (v.id) {
    const { data: current } = await supabase.from("stories").select("status").eq("id", v.id).maybeSingle()
    const candidates = [row.cover_media_id, row.featured_video_id].filter((x): x is string => !!x)
    if (current?.status === "published" && candidates.length) {
      const err = await prePublish(candidates, precopied)
      if (err) return { error: err }
    }
  }

  const { data: storyId, error } = await supabase.rpc("save_story", {
    p_id: v.id ?? null,
    p_expected_updated_at: v.id ? expectedUpdatedAt(formData) : null,
    p_story: row,
    p_translations: v.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      summary: t.summary ?? null,
      body: t.body ?? null,
      seo_description: t.seo_description ?? null,
    })),
  })
  if (error || !storyId) {
    await safeRetract(precopied)
    return { error: editorialErrorMessage(error) }
  }

  invalidate()
  redirect(`/admin/en-action/${storyId as string}?saved=1`)
}

/**
 * Remplace la galerie ordonnée (RPC replace_story_media, transaction unique :
 * en cas d'échec, l'ancienne galerie est conservée). Rétrospective publiée :
 * les nouveaux médias sont validés et copiés avant ; ceux retirés de la
 * galerie perdent leur copie publique s'ils ne sont plus utilisés.
 */
export async function saveStoryMedia(formData: FormData) {
  await requireEditor()
  const storyId = String(formData.get("story_id") ?? "")
  if (!idSchema.safeParse(storyId).success) redirect("/admin/en-action?error=invalid")
  const items = parseStoryMediaForm(formData)
  const supabase = await createClient()

  const { data: s } = await supabase.from("stories").select("status").eq("id", storyId).maybeSingle()
  if (!s) back(storyId, `error=${encodeURIComponent("Rétrospective introuvable.")}`)
  const precopied: string[] = []
  if (s?.status === "published" && items.length) {
    const err = await prePublish(items.map((it) => it.media_id), precopied)
    if (err) back(storyId, `error=${encodeURIComponent(err)}`)
  }

  const { data: removed, error } = await supabase.rpc("replace_story_media", { p_story_id: storyId, p_items: items })
  if (error) {
    await safeRetract(precopied)
    back(storyId, `error=${encodeURIComponent(editorialErrorMessage(error, "Mise à jour des médias impossible."))}`)
  }
  if (s?.status === "published") await safeRetract((removed as string[] | null) ?? [])

  invalidate()
  back(storyId, "saved=1")
}

/**
 * Valide et copie publiquement des médias AVANT une mutation. Renseigne
 * `copied` pour permettre la compensation si la mutation échoue ensuite.
 */
async function prePublish(mediaIds: string[], copied: string[]): Promise<string | null> {
  try {
    const { published, refused } = await publishMedia(mediaIds)
    copied.push(...published)
    if (refused.length) {
      await safeRetract(copied)
      return `${refused.length} média(s) sans droits approuvés ou sans texte alternatif : aucune modification enregistrée.`
    }
    return null
  } catch (e) {
    await safeRetract(copied)
    return (e as Error).message
  }
}

async function storyMediaIds(storyId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("stories")
    .select("cover_media_id, featured_video_id, story_media(media_id)")
    .eq("id", storyId)
    .single()
  if (!data) return []
  const d = data as { cover_media_id: string | null; featured_video_id: string | null; story_media: { media_id: string }[] }
  return [d.cover_media_id, d.featured_video_id, ...d.story_media.map((m) => m.media_id)].filter((x): x is string => !!x)
}

async function safeRetract(ids: string[]) {
  if (!ids.length) return
  try {
    await retractUnusedMedia(ids)
  } catch (e) {
    console.error("[stories] retrait public incomplet — voir la réconciliation des médias", (e as Error).message)
  }
}

export async function publishStoryAction(formData: FormData) {
  await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/en-action?error=invalid")
  const supabase = await createClient()

  // 1. Copie publique des médias approuvés (idempotente) ; refus sans mutation.
  const mediaIds = await storyMediaIds(id)
  const copied: string[] = []
  const err = await prePublish(mediaIds, copied)
  if (err) back(id, `error=${encodeURIComponent(err)}`)

  // 2. Transition atomique ; la base revérifie titre et droits de chaque média.
  const { error } = await supabase.rpc("transition_story", { p_id: id, p_transition: "publish" })
  if (error) {
    await safeRetract(copied)
    back(id, `error=${encodeURIComponent(editorialErrorMessage(error, "Publication impossible."))}`)
  }
  invalidate()
  back(id, "published=1")
}

async function withdraw(formData: FormData, target: "unpublish" | "archive") {
  await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/en-action?error=invalid")
  const supabase = await createClient()
  const { error } = await supabase.rpc("transition_story", { p_id: id, p_transition: target })
  if (error) back(id, `error=${encodeURIComponent(editorialErrorMessage(error, "Changement de statut impossible."))}`)
  await safeRetract(await storyMediaIds(id))
  invalidate()
  back(id, target === "archive" ? "archived=1" : "unpublished=1")
}

export async function unpublishStoryAction(formData: FormData) {
  await withdraw(formData, "unpublish")
}

export async function archiveStoryAction(formData: FormData) {
  await withdraw(formData, "archive")
}

export async function deleteStoryAction(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/en-action?error=invalid")
  const supabase = await createClient()
  const { data: s } = await supabase.from("stories").select("status").eq("id", id).single()
  if (!s || s.status === "published") back(id, `error=${encodeURIComponent("Retirez la rétrospective avant de la supprimer.")}`)
  const { error } = await supabase.from("stories").delete().eq("id", id).neq("status", "published")
  if (error) back(id, `error=${encodeURIComponent("Suppression impossible.")}`)
  await logAudit(supabase, editor.id, "story.delete", "story", id)
  invalidate()
  redirect("/admin/en-action?deleted=1")
}
