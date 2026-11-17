"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireAdmin, requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { editorialErrorMessage, expectedUpdatedAt } from "@/lib/editorial/rpc"
import { parseEditorialForm, parseEventForm, toEventRow } from "@/lib/events/form"
import { runLumaSync } from "@/lib/events/luma-sync"
import { isSupabaseAdminConfigured } from "@/lib/env"
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
 * Mise à jour d'une fiche historique saisie manuellement (source « manual »).
 * Les événements sont désormais créés dans Luma : aucune création ici. et de ses traductions en UNE transaction
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
  if (!existingId) return { error: "Les événements sont créés dans Luma puis synchronisés ; aucune création manuelle." }
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

/**
 * Compléments éditoriaux d'un événement (visuel et textes BIB uniquement).
 * La RPC save_event ignore tout autre champ pour un événement Luma.
 */
export async function saveEventEditorial(_: FormState, formData: FormData): Promise<FormState> {
  await requireEditor()
  const parsed = parseEditorialForm(formData)
  if (!parsed.success) {
    return { error: "Le formulaire contient des erreurs.", issues: parsed.error.issues.map((i) => i.message) }
  }
  const { id, cover_media_id } = parsed.data
  const supabase = await createClient()
  const { data: current } = await supabase.from("events").select("status, source").eq("id", id).maybeSingle()
  if (!current) return { error: "Fiche introuvable." }
  let precopied: string | null = null
  if (current.status === "published" && cover_media_id) {
    try {
      const { refused } = await publishMedia([cover_media_id])
      if (refused.length) return { error: "Image non diffusable : ses droits ne sont pas approuvés. Aucune modification enregistrée." }
      precopied = cover_media_id
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
  const { error } = await supabase.rpc("save_event", {
    p_id: id,
    p_expected_updated_at: expectedUpdatedAt(formData),
    p_event: { cover_media_id: cover_media_id ?? null },
    p_translations: parsed.data.translations.map((t) => ({ locale: t.locale, title: t.title, summary: t.summary ?? null, description: t.description ?? null })),
  })
  if (error) {
    if (precopied) await safeRetract([precopied])
    return { error: editorialErrorMessage(error) }
  }
  invalidate()
  redirect(`/admin/evenements/${id}?saved=1`)
}

const MAX_ICS_BYTES = 10 * 1024 * 1024

function syncRedirect(report: { ok: boolean; skipped?: string; error?: string; counts?: Record<string, number> }) {
  if (report.skipped) redirect(`/admin/evenements?error=${encodeURIComponent("Une synchronisation est déjà en cours.")}`)
  if (!report.ok) redirect(`/admin/evenements?error=${encodeURIComponent(`Synchronisation en échec : ${(report.error ?? "erreur inconnue").slice(0, 200)}`)}`)
  redirect("/admin/evenements?synced=1")
}

/** Synchronisation manuelle depuis le flux iCal Luma configuré (admin). */
export async function syncLumaNowAction() {
  const admin = await requireAdmin()
  if (!isSupabaseAdminConfigured()) redirect(`/admin/evenements?error=${encodeURIComponent("Clé de service Supabase non configurée.")}`)
  const report = await runLumaSync({ trigger: "manual", requestedBy: admin.id })
  if (report.ok) invalidate()
  syncRedirect(report)
}

/**
 * Import d'un export .ics Luma (historique) : même chemin de validation et
 * d'UPSERT que le flux, sans marquer d'absents (flux partiel).
 */
export async function uploadLumaIcsAction(formData: FormData) {
  const admin = await requireAdmin()
  if (!isSupabaseAdminConfigured()) redirect(`/admin/evenements?error=${encodeURIComponent("Clé de service Supabase non configurée.")}`)
  const file = formData.get("ics")
  if (!(file instanceof File) || file.size === 0) redirect(`/admin/evenements?error=${encodeURIComponent("Fichier .ics manquant.")}`)
  if (file.size > MAX_ICS_BYTES) redirect(`/admin/evenements?error=${encodeURIComponent("Fichier trop volumineux (10 Mo maximum).")}`)
  if (!/\.ics$/i.test(file.name)) redirect(`/admin/evenements?error=${encodeURIComponent("Extension .ics attendue.")}`)
  const report = await runLumaSync({ trigger: "upload", requestedBy: admin.id, icsText: await file.text() })
  if (report.ok) invalidate()
  syncRedirect(report)
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

/**
 * Suppression définitive : uniquement pour une fiche historique saisie à la
 * main et non publiée. Un événement Luma n'est jamais supprimé (il serait
 * réimporté) : on le retire du site ou on l'archive.
 */
export async function deleteEventAction(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!idSchema.safeParse(id).success) redirect("/admin/evenements?error=invalid")
  const supabase = await createClient()
  const { data: ev } = await supabase.from("events").select("status, source").eq("id", id).single()
  if (ev?.source === "luma") {
    redirect(`/admin/evenements/${id}?error=${encodeURIComponent("Un événement Luma n'est jamais supprimé : retirez-le du site ou archivez-le.")}`)
  }
  if (!ev || ev.status === "published") {
    redirect(`/admin/evenements/${id}?error=${encodeURIComponent("Retirez la fiche avant de la supprimer.")}`)
  }
  const { error } = await supabase.from("events").delete().eq("id", id)
  if (error) redirect(`/admin/evenements/${id}?error=${encodeURIComponent("Suppression impossible.")}`)
  await logAudit(supabase, editor.id, "event.delete", "event", id)
  invalidate()
  redirect("/admin/evenements?deleted=1")
}
