"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireAdmin, requireEditor } from "@/lib/auth/editor"
import { getAdminClient } from "@/lib/supabase/admin"
import { generateInsightDraft } from "@/lib/sob/insights"
import { SOB_TAG } from "@/lib/sob/load"
import { isAiConfigured, isSupabaseAdminConfigured } from "@/lib/env"

export async function generateInsightAction(formData: FormData) {
  const editor = await requireEditor()
  const locale = String(formData.get("locale") ?? "")
  if (!["fr", "en", "es"].includes(locale)) redirect("/admin/insights?error=invalid")
  if (!isAiConfigured() || !isSupabaseAdminConfigured()) {
    redirect(`/admin/insights?error=${encodeURIComponent("Moteur IA ou Supabase non configuré.")}`)
  }
  try {
    await generateInsightDraft(locale as "fr" | "en" | "es", editor.id)
  } catch (e) {
    redirect(`/admin/insights?error=${encodeURIComponent((e as Error).message)}`)
  }
  redirect("/admin/insights?saved=1")
}

/** Publication sur le site : action distincte, réservée aux administrateurs. */
export async function setInsightStatusAction(formData: FormData) {
  const admin = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (!z.uuid().safeParse(id).success || !["approved", "published", "rejected", "draft"].includes(status)) redirect("/admin/insights?error=invalid")
  const client = getAdminClient()
  const patch: Record<string, unknown> = { status }
  if (status === "published") {
    patch.published_at = new Date().toISOString()
    patch.approved_by = admin.id
  }
  const { error } = await client.from("sob_insights").update(patch).eq("id", id)
  if (error) redirect(`/admin/insights?error=${encodeURIComponent("Mise à jour impossible.")}`)
  await client.from("editorial_audit").insert({ actor_id: admin.id, action: `sob_insight.${status}`, entity_type: "sob_insight", entity_id: id })
  updateTag(SOB_TAG)
  redirect(`/admin/insights?${status === "published" ? "published" : "saved"}=1`)
}
