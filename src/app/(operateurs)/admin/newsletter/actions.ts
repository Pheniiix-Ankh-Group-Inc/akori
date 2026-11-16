"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireAdmin, requireEditor } from "@/lib/auth/editor"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { logAudit } from "@/lib/audit"
import { createClient } from "@/lib/supabase/server"
import { parseHumanDraft } from "@/lib/newsletter/human"
import { weekStartFor } from "@/lib/newsletter/schedule"
import { zonedLocalToUtcIso } from "@/lib/time"
import {
  approveCycle,
  cancelCycle,
  createManualCycle,
  regenerateCycle,
  rejectCycle,
  saveHumanPair,
  scheduleCycle,
  sendCycleNow,
} from "@/lib/newsletter/orchestrator"

const BASE = "/admin/newsletter"
const back = (id: string, q: string) => redirect(`${BASE}/${id}?${q}`)
const err = (id: string | null, msg: string): never => redirect(`${id ? `${BASE}/${id}` : BASE}?error=${encodeURIComponent(msg.slice(0, 300))}`)

function cycleId(fd: FormData): string {
  const id = String(fd.get("cycle_id") ?? "")
  if (!z.uuid().safeParse(id).success) err(null, "Cycle invalide.")
  return id
}

function ensureServer() {
  if (!isSupabaseAdminConfigured()) err(null, "Clé de service Supabase non configurée.")
}

async function audit(actor: string, action: string, id: string, details: Record<string, string | number | boolean | null> = {}) {
  await logAudit(await createClient(), actor, action, "newsletter", id, details)
}

/** Création d'un cycle (semaine en cours ou suivante) piloté par l'équipe. */
export async function createCycleAction(fd: FormData) {
  const editor = await requireEditor()
  ensureServer()
  const which = String(fd.get("week") ?? "current")
  const now = new Date()
  const weekStart = weekStartFor(which === "next" ? new Date(now.getTime() + 7 * 86400000) : now)
  let id: string
  try {
    id = (await createManualCycle(weekStart, editor.id)).id
  } catch (e) {
    err(null, (e as Error).message)
  }
  await audit(editor.id, "newsletter.create", id!, { week_start: weekStart })
  back(id!, "saved=1")
}

/** Enregistrement d'une paire FR/EN éditée (contrôles automatiques inclus). */
export async function saveEditionAction(fd: FormData) {
  const editor = await requireEditor()
  ensureServer()
  const id = cycleId(fd)
  const { draft, issues } = parseHumanDraft(fd)
  if (issues.length) err(id, issues.join(" "))
  let failed: string[] = []
  try {
    failed = (await saveHumanPair(id, draft, editor.id)).failed.map((f) => f.key)
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(editor.id, "newsletter.edit", id, { failed: failed.join(",") })
  if (failed.length) err(id, `Version enregistrée mais bloquée par les contrôles : ${failed.join(", ")}.`)
  back(id, "saved=1")
}

export async function regenerateAction(fd: FormData) {
  const editor = await requireEditor()
  ensureServer()
  const id = cycleId(fd)
  let failed: string[] = []
  try {
    failed = (await regenerateCycle(id)).failed.map((f) => f.key)
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(editor.id, "newsletter.regenerate", id, { failed: failed.join(",") })
  if (failed.length) err(id, `Nouvelle version IA bloquée par les contrôles : ${failed.join(", ")}.`)
  back(id, "saved=1")
}

export async function approveAction(fd: FormData) {
  const admin = await requireAdmin()
  ensureServer()
  const id = cycleId(fd)
  try {
    await approveCycle(id, admin.id)
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(admin.id, "newsletter.approve", id)
  back(id, "approved=1")
}

export async function rejectAction(fd: FormData) {
  const admin = await requireAdmin()
  ensureServer()
  const id = cycleId(fd)
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300)
  if (!reason) err(id, "Un motif de rejet est requis.")
  try {
    await rejectCycle(id, reason)
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(admin.id, "newsletter.reject", id, { reason })
  back(id, "rejected=1")
}

/** Planification : date et heure saisies à Toronto ; vide = créneau standard. */
export async function scheduleAction(fd: FormData) {
  const admin = await requireAdmin()
  ensureServer()
  const id = cycleId(fd)
  const local = String(fd.get("slot_local") ?? "").trim()
  const iso = local ? zonedLocalToUtcIso(local, "America/Toronto") : null
  if (local && !iso) err(id, "Date ou heure invalide.")
  try {
    await scheduleCycle(id, iso)
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(admin.id, "newsletter.schedule", id, { scheduled_for: iso })
  back(id, "scheduled=1")
}

export async function cancelAction(fd: FormData) {
  const admin = await requireAdmin()
  ensureServer()
  const id = cycleId(fd)
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300) || "sans motif"
  try {
    await cancelCycle(id, reason)
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(admin.id, "newsletter.cancel", id, { reason })
  back(id, "cancelled=1")
}

/** Envoi immédiat (admin) : mêmes garde-fous que l'envoi planifié. */
export async function sendNowAction(fd: FormData) {
  const admin = await requireAdmin()
  ensureServer()
  const id = cycleId(fd)
  if (String(fd.get("confirm") ?? "") !== "ENVOYER") err(id, "Confirmation manquante : saisissez ENVOYER.")
  let status = ""
  try {
    status = (await sendCycleNow(id)).status
  } catch (e) {
    err(id, (e as Error).message)
  }
  await audit(admin.id, "newsletter.send_now", id, { status })
  if (status !== "sent") err(id, `Envoi non effectué (statut : ${status}). Voir le journal du cycle.`)
  back(id, "sent=1")
}
