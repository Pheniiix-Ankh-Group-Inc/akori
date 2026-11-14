"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { editorialErrorMessage, expectedUpdatedAt } from "@/lib/editorial/rpc"
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

/**
 * Création ou mise à jour d'une fiche et de ses traductions en UNE transaction
 * (RPC save_event), avec contrôle de modification concurrente.
 * Fiche publiée : le nouveau visuel est validé et copié publiquement AVANT la
 * mutation ; si la mutation échoue, la copie devenue inutile est retirée.
 */
export async function saveEvent(_: FormState, formData: FormData): Promise<FormState> {
  await requireEditor()
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
  const existingId = parsed.data.id ?? null
  let precopied: string | null = null

  if (existingId && row.cover_media_id) {
    const { data: current } = await supabase.from("events").select("status").eq("id", existingId).maybeSingle()
    if (current?.status === "published") {
      try {
        const { refused } = await publishMedia([row.cover_media_id])
        if (refused.length) return { error: "Image non diffusable : ses droits ne sont pas approuvés. Aucune modification enregistrée." }
        precopied = row.cover_media_id
      } catch (e) {
        return { error: (e as Error).message }
      }
    }
  }

  const { data: eventId, error } = await supabase.rpc("save_event", {
    p_id: existingId,
    p_expected_updated_at: existingId ? expectedUpdatedAt(formData) : null,
    p_event: row,
    p_translations: parsed.data.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      summary: t.summary ?? null,
      description: t.description ?? null,
    })),
  })
  if (error || !eventId) {
    if (precopied) await safeRetract([precopied])
    return { error: editorialErrorMessage(error) }
  }

  invalidate()
  redirect(`/admin/evenements/${eventId as string}?saved=1`)
}

type Transition = "publish" | "unpublish" | "archive"

/**
 * Transition de statut atomique et idempotente (RPC transition_event, avec
 * journal d'audit dans la même transaction). Pour publier, le visuel est
 * d'abord copié publiquement ; en cas de refus en base, la copie est retirée.
 */
export async function changeEventStatus(eventId: string, transition: Transition): Promise<FormState> {
  await requireEditor()
  if (!idSchema.safeParse(eventId).success) return { error: "Identifiant invalide." }
  const supabase = await createClient()

  const { data: ev, error } = await supabase.from("events").select("id, cover_media_id").eq("id", eventId).single()
  if (error || !ev) return { error: "Fiche introuvable." }
  const cover = (ev.cover_media_id as string | null) ?? null

  if (transition === "publish" && cover) {
    try {
      const { refused } = await publishMedia([cover])
      if (refused.length) return { error: "Impossible de publier : les droits de l'image ne sont pas approuvés." }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  const { error: rpcError } = await supabase.rpc("transition_event", { p_id: eventId, p_transition: transition })
  if (rpcError) {
    if (transition === "publish" && cover) await safeRetract([cover])
    return { error: editorialErrorMessage(rpcError, "Changement de statut impossible.") }
  }
  if (transition !== "publish" && cover) await safeRetract([cover])

  invalidate()
  return {}
}

/** Retrait des copies publiques inutilisées ; un échec est signalé, jamais masqué. */
async function safeRetract(ids: string[]) {
  try {
    await retractUnusedMedia(ids)
  } catch (e) {
    console.error("[events] retrait du visuel public incomplet — voir la réconciliation des médias", (e as Error).message)
  }
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
