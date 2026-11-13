"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
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

export async function saveStory(_: FormState, formData: FormData): Promise<FormState> {
  const editor = await requireEditor()
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
    updated_by: editor.id,
  }

  let storyId = v.id
  if (storyId) {
    const { error } = await supabase.from("stories").update(row).eq("id", storyId)
    if (error) return { error: error.code === "23505" ? "Cet identifiant d'URL est déjà utilisé." : "Enregistrement impossible." }
  } else {
    const { data, error } = await supabase.from("stories").insert({ ...row, status: "draft", created_by: editor.id }).select("id").single()
    if (error || !data) return { error: error?.code === "23505" ? "Cet identifiant d'URL est déjà utilisé." : "Création impossible." }
    storyId = data.id as string
  }

  const filled = v.translations.filter((t) => t.title.length > 0)
  const empty = v.translations.filter((t) => t.title.length === 0).map((t) => t.locale)
  if (filled.length) {
    const { error } = await supabase.from("story_translations").upsert(
      filled.map((t) => ({
        story_id: storyId,
        locale: t.locale,
        title: t.title,
        summary: t.summary ?? null,
        body: t.body ?? null,
        seo_description: t.seo_description ?? null,
      })),
      { onConflict: "story_id,locale" },
    )
    if (error) return { error: "Enregistrement des textes impossible." }
  }
  if (empty.length) await supabase.from("story_translations").delete().eq("story_id", storyId).in("locale", empty)

  // Contenu déjà publié : ses nouveaux médias doivent être diffusables.
  const { data: s } = await supabase.from("stories").select("status").eq("id", storyId).single()
  if (s?.status === "published") {
    const err = await syncPublishedMedia(storyId!)
    if (err) return { error: err }
  }

  await logAudit(supabase, editor.id, v.id ? "story.update" : "story.create", "story", storyId!)
  invalidate()
  redirect(`/admin/en-action/${storyId}?saved=1`)
}

/** Remplace la liste ordonnée des médias d'une rétrospective. */
export async function saveStoryMedia(formData: FormData) {
  const editor = await requireEditor()
  const storyId = String(formData.get("story_id") ?? "")
  if (!idSchema.safeParse(storyId).success) redirect("/admin/en-action?error=invalid")
  const items = parseStoryMediaForm(formData)
  const supabase = await createClient()

  const { data: previous } = await supabase.from("story_media").select("media_id").eq("story_id", storyId)
  const { error: delError } = await supabase.from("story_media").delete().eq("story_id", storyId)
  if (delError) back(storyId, `error=${encodeURIComponent("Mise à jour des médias impossible.")}`)
  if (items.length) {
    const { error } = await supabase.from("story_media").insert(items.map((it) => ({ story_id: storyId, ...it })))
    if (error) back(storyId, `error=${encodeURIComponent("Mise à jour des médias impossible.")}`)
  }

  const { data: s } = await supabase.from("stories").select("status").eq("id", storyId).single()
  if (s?.status === "published") {
    const err = await syncPublishedMedia(storyId)
    if (err) back(storyId, `error=${encodeURIComponent(err)}`)
    const removed = ((previous ?? []) as { media_id: string }[]).map((p) => p.media_id).filter((id) => !items.some((it) => it.media_id === id))
    if (removed.length) await safeRetract(removed)
  }

  await logAudit(supabase, editor.id, "story.media_update", "story", storyId, { count: items.length })
  invalidate()
  back(storyId, "saved=1")
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

/** Copie publique des médias d'un contenu publié ; refuse si droits non approuvés. */
async function syncPublishedMedia(storyId: string): Promise<string | null> {
  try {
    const { refused } = await publishMedia(await storyMediaIds(storyId))
    if (refused.length) return `${refused.length} média(s) sans droits approuvés : publication refusée pour ces fichiers.`
    return null
  } catch (e) {
    return (e as Error).message
  }
}

async function safeRetract(ids: string[]) {
  try {
    await retractUnusedMedia(ids)
  } catch (e) {
    console.error("[stories] retrait public incomplet", (e as Error).message)
  }
}

export async function publishStoryAction(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/en-action?error=invalid")
  const supabase = await createClient()
  const { data: s } = await supabase.from("stories").select("id, story_translations(locale)").eq("id", id).single()
  if (!s || !(s.story_translations as unknown[]).length) back(id, `error=${encodeURIComponent("Impossible de publier : aucun titre.")}`)

  // Tous les médias doivent avoir des droits approuvés avant publication.
  const err = await syncPublishedMedia(id)
  if (err) back(id, `error=${encodeURIComponent(err)}`)

  const { error } = await supabase
    .from("stories")
    .update({ status: "published", published_at: new Date().toISOString(), archived_at: null, updated_by: editor.id })
    .eq("id", id)
  if (error) back(id, `error=${encodeURIComponent("Publication impossible.")}`)
  await logAudit(supabase, editor.id, "story.publish", "story", id)
  invalidate()
  back(id, "published=1")
}

async function withdraw(formData: FormData, target: "draft" | "archived") {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/en-action?error=invalid")
  const supabase = await createClient()
  const patch = target === "archived" ? { status: "archived", archived_at: new Date().toISOString(), updated_by: editor.id } : { status: "draft", updated_by: editor.id }
  const { error } = await supabase.from("stories").update(patch).eq("id", id)
  if (error) back(id, `error=${encodeURIComponent("Changement de statut impossible.")}`)
  await safeRetract(await storyMediaIds(id))
  await logAudit(supabase, editor.id, target === "archived" ? "story.archive" : "story.unpublish", "story", id)
  invalidate()
  back(id, target === "archived" ? "archived=1" : "unpublished=1")
}

export async function unpublishStoryAction(formData: FormData) {
  await withdraw(formData, "draft")
}

export async function archiveStoryAction(formData: FormData) {
  await withdraw(formData, "archived")
}

export async function deleteStoryAction(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/en-action?error=invalid")
  const supabase = await createClient()
  const { data: s } = await supabase.from("stories").select("status").eq("id", id).single()
  if (!s || s.status === "published") back(id, `error=${encodeURIComponent("Retirez la rétrospective avant de la supprimer.")}`)
  const { error } = await supabase.from("stories").delete().eq("id", id)
  if (error) back(id, `error=${encodeURIComponent("Suppression impossible.")}`)
  await logAudit(supabase, editor.id, "story.delete", "story", id)
  invalidate()
  redirect("/admin/en-action?deleted=1")
}
