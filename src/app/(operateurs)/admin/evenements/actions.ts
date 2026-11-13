"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { parseEventForm, toEventRow } from "@/lib/events/form"
import { EVENTS_TAG, MEDIA_TAG } from "@/lib/events/queries"
import { publishMedia, retractUnusedMedia } from "@/lib/media/publication"

export interface FormState {
  error?: string
  issues?: string[]
}

const idSchema = z.uuid()

function invalidate() {
  updateTag(EVENTS_TAG)
  updateTag(MEDIA_TAG)
}

/** Création ou mise à jour d'une fiche (reste dans son statut actuel). */
export async function saveEvent(_: FormState, formData: FormData): Promise<FormState> {
  const editor = await requireEditor()
  const parsed = parseEventForm(formData)
  if (!parsed.success) {
    return { error: "Le formulaire contient des erreurs.", issues: parsed.error.issues.map((i) => i.message) }
  }

  let row
  try {
    row = toEventRow(parsed.data)
  } catch (e) {
    return { error: (e as Error).message }
  }

  const supabase = await createClient()
  let eventId = parsed.data.id

  if (eventId) {
    const { error } = await supabase.from("events").update({ ...row, updated_by: editor.id }).eq("id", eventId)
    if (error) return { error: error.code === "23505" ? "Cet identifiant d'URL est déjà utilisé." : "Enregistrement impossible." }
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...row, status: "draft", created_by: editor.id, updated_by: editor.id })
      .select("id")
      .single()
    if (error || !data) return { error: error?.code === "23505" ? "Cet identifiant d'URL est déjà utilisé." : "Création impossible." }
    eventId = data.id as string
  }

  const filled = parsed.data.translations.filter((t) => t.title.length > 0)
  const empty = parsed.data.translations.filter((t) => t.title.length === 0).map((t) => t.locale)
  if (filled.length) {
    const { error } = await supabase.from("event_translations").upsert(
      filled.map((t) => ({ event_id: eventId, locale: t.locale, title: t.title, summary: t.summary ?? null, description: t.description ?? null })),
      { onConflict: "event_id,locale" },
    )
    if (error) return { error: "Enregistrement des textes impossible." }
  }
  if (empty.length) {
    await supabase.from("event_translations").delete().eq("event_id", eventId).in("locale", empty)
  }

  // Si la fiche est déjà publiée, sa nouvelle image doit être publiée aussi.
  const { data: current } = await supabase.from("events").select("status, cover_media_id").eq("id", eventId).single()
  if (current?.status === "published" && current.cover_media_id) {
    try {
      const { refused } = await publishMedia([current.cover_media_id as string])
      if (refused.length) return { error: "Image enregistrée mais non diffusée : ses droits ne sont pas approuvés." }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  await logAudit(supabase, editor.id, parsed.data.id ? "event.update" : "event.create", "event", eventId!)
  invalidate()
  redirect(`/admin/evenements/${eventId}?saved=1`)
}

type Transition = "publish" | "unpublish" | "archive"

export async function changeEventStatus(eventId: string, transition: Transition): Promise<FormState> {
  const editor = await requireEditor()
  if (!idSchema.safeParse(eventId).success) return { error: "Identifiant invalide." }
  const supabase = await createClient()

  const { data: ev, error } = await supabase
    .from("events")
    .select("id, status, cover_media_id, luma_url, event_translations(locale)")
    .eq("id", eventId)
    .single()
  if (error || !ev) return { error: "Fiche introuvable." }

  if (transition === "publish") {
    if (!ev.event_translations || ev.event_translations.length === 0) {
      return { error: "Impossible de publier : aucun titre n'est renseigné." }
    }
    if (ev.cover_media_id) {
      try {
        const { refused } = await publishMedia([ev.cover_media_id as string])
        if (refused.length) return { error: "Impossible de publier : les droits de l'image ne sont pas approuvés." }
      } catch (e) {
        return { error: (e as Error).message }
      }
    }
    const { error: e } = await supabase
      .from("events")
      .update({ status: "published", published_at: new Date().toISOString(), archived_at: null, updated_by: editor.id })
      .eq("id", eventId)
    if (e) return { error: "Publication impossible." }
  } else {
    const patch =
      transition === "archive"
        ? { status: "archived", archived_at: new Date().toISOString(), updated_by: editor.id }
        : { status: "draft", updated_by: editor.id }
    const { error: e } = await supabase.from("events").update(patch).eq("id", eventId)
    if (e) return { error: "Changement de statut impossible." }
    if (ev.cover_media_id) {
      try {
        await retractUnusedMedia([ev.cover_media_id as string])
      } catch (e) {
        console.error("[events] retrait du visuel public incomplet", (e as Error).message)
      }
    }
  }

  await logAudit(supabase, editor.id, `event.${transition}`, "event", eventId)
  invalidate()
  return {}
}

export async function publishEventAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  const res = await changeEventStatus(id, "publish")
  redirect(`/admin/evenements/${id}?${res.error ? `error=${encodeURIComponent(res.error)}` : "published=1"}`)
}

export async function unpublishEventAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  const res = await changeEventStatus(id, "unpublish")
  redirect(`/admin/evenements/${id}?${res.error ? `error=${encodeURIComponent(res.error)}` : "unpublished=1"}`)
}

export async function archiveEventAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  const res = await changeEventStatus(id, "archive")
  redirect(`/admin/evenements/${id}?${res.error ? `error=${encodeURIComponent(res.error)}` : "archived=1"}`)
}

/** Suppression définitive : uniquement pour une fiche non publiée. */
export async function deleteEventAction(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/evenements?error=invalid")
  const supabase = await createClient()
  const { data: ev } = await supabase.from("events").select("status").eq("id", id).single()
  if (!ev || ev.status === "published") {
    redirect(`/admin/evenements/${id}?error=${encodeURIComponent("Retirez la fiche avant de la supprimer.")}`)
  }
  const { error } = await supabase.from("events").delete().eq("id", id)
  if (error) redirect(`/admin/evenements/${id}?error=${encodeURIComponent("Suppression impossible.")}`)
  await logAudit(supabase, editor.id, "event.delete", "event", id)
  invalidate()
  redirect("/admin/evenements?deleted=1")
}
