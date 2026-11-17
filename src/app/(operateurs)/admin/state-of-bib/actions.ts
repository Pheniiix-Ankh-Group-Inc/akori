"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { editorialErrorMessage } from "@/lib/editorial/rpc"
import { SOB_TAG } from "@/lib/sob/load"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { checkSobCoherence } from "@/lib/sob/reconcile"
import { dispatchWorkflow } from "@/lib/ops/github"
import { logAudit } from "@/lib/audit"

const BASE = "/admin/state-of-bib"

function fail(msg: string): never {
  redirect(`${BASE}?error=${encodeURIComponent(msg)}`)
}

function versionId(formData: FormData): string {
  const id = String(formData.get("id") ?? "")
  if (!z.uuid().safeParse(id).success) fail("Identifiant invalide.")
  return id
}

/** Approbation et publication atomique d'une candidate validée (admin). */
export async function approveVersionAction(formData: FormData) {
  await requireAdmin()
  const id = versionId(formData)
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null
  const supabase = await createClient()
  const { error } = await supabase.rpc("publish_dataset_candidate", { p_version_id: id, p_note: note })
  if (error) fail(editorialErrorMessage(error, "Publication impossible."))
  updateTag(SOB_TAG)
  redirect(`${BASE}?approved=1`)
}

/** Rejet motivé d'une candidate (validée ou bloquée). */
export async function rejectVersionAction(formData: FormData) {
  await requireAdmin()
  const id = versionId(formData)
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500)
  if (!reason) fail("Un motif de rejet est requis.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("reject_dataset_candidate", { p_version_id: id, p_reason: reason })
  if (error) fail(editorialErrorMessage(error, "Rejet impossible."))
  redirect(`${BASE}?rejected=1`)
}

/** Restauration d'une version publiée auparavant (retour arrière). */
export async function restoreVersionAction(formData: FormData) {
  await requireAdmin()
  const id = versionId(formData)
  const supabase = await createClient()
  const { error } = await supabase.rpc("restore_dataset_version", { p_version_id: id })
  if (error) fail(editorialErrorMessage(error, "Restauration impossible."))
  updateTag(SOB_TAG)
  redirect(`${BASE}?restored=1`)
}

/** Contrôle immédiat de la cohérence PostgreSQL ↔ Storage de la version courante. */
export async function checkCoherenceAction() {
  await requireAdmin()
  if (!isSupabaseAdminConfigured()) fail("Clé de service Supabase non configurée.")
  let state = ""
  try {
    state = (await checkSobCoherence("manual")).state
  } catch (e) {
    fail(`Contrôle impossible : ${(e as Error).message.slice(0, 160)}`)
  }
  if (state === "storage_mismatch") fail("Incohérence détectée entre PostgreSQL et Storage : un incident critique a été créé.")
  updateTag(SOB_TAG)
  redirect(`${BASE}?checked=1`)
}

/**
 * Relance du pipeline (vérification de la source, et reconstruction forcée si
 * demandé) par workflow_dispatch. Indépendant de BIB_SCHEDULES_ENABLED.
 */
export async function runPipelineAction(formData: FormData) {
  const admin = await requireAdmin()
  const force = formData.get("force") === "on"
  const res = await dispatchWorkflow("refresh-data.yml", { force_build: force ? "true" : "false" })
  if (!res.ok) fail(res.error)
  await logAudit(await createClient(), admin.id, "automation.pipeline_dispatch", "automation", null, { workflow: "refresh-data.yml", force })
  redirect(`${BASE}?dispatched=1`)
}
