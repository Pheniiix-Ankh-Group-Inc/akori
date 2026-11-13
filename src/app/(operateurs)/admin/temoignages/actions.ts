"use server"

import { redirect } from "next/navigation"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { TESTIMONIALS_TAG } from "@/lib/stories/queries"

const nullableUuid = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => !v || z.uuid().safeParse(v).success)

const schema = z.object({
  id: z.uuid().optional(),
  story_id: nullableUuid,
  event_id: nullableUuid,
  locale: z.enum(["fr", "en", "es"]),
  quote: z.string().trim().min(1).max(1200),
  author_name: z.string().trim().min(1).max(120),
  author_role: z.string().trim().max(160),
  consent_reference: z.string().trim().min(1, "La référence de consentement est obligatoire.").max(300),
  position: z.coerce.number().int().min(0).max(10000),
})

/**
 * Témoignages authentiques : texte tel que fourni par son auteur,
 * référence de consentement obligatoire. Aucun texte généré.
 */
export async function saveTestimonial(formData: FormData) {
  const editor = await requireEditor()
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    story_id: formData.get("story_id") ?? "",
    event_id: formData.get("event_id") ?? "",
    locale: formData.get("locale"),
    quote: formData.get("quote"),
    author_name: formData.get("author_name"),
    author_role: formData.get("author_role") ?? "",
    consent_reference: formData.get("consent_reference"),
    position: formData.get("position") ?? 0,
  })
  if (!parsed.success) {
    redirect(`/admin/temoignages${formData.get("id") ? `/${formData.get("id")}` : "/nouveau"}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulaire invalide.")}`)
  }
  const v = parsed.data
  const supabase = await createClient()
  const row = {
    story_id: v.story_id,
    event_id: v.event_id,
    locale: v.locale,
    quote: v.quote,
    author_name: v.author_name,
    author_role: v.author_role || null,
    consent_reference: v.consent_reference,
    position: v.position,
  }
  let id = v.id
  if (id) {
    const { error } = await supabase.from("testimonials").update(row).eq("id", id)
    if (error) redirect(`/admin/temoignages/${id}?error=${encodeURIComponent("Enregistrement impossible.")}`)
  } else {
    const { data, error } = await supabase.from("testimonials").insert({ ...row, status: "draft", created_by: editor.id }).select("id").single()
    if (error || !data) redirect(`/admin/temoignages/nouveau?error=${encodeURIComponent("Création impossible.")}`)
    id = data.id as string
  }
  await logAudit(supabase, editor.id, v.id ? "testimonial.update" : "testimonial.create", "testimonial", id!)
  updateTag(TESTIMONIALS_TAG)
  redirect(`/admin/temoignages/${id}?saved=1`)
}

export async function setTestimonialStatus(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (!z.uuid().safeParse(id).success || !["draft", "published", "archived"].includes(status)) {
    redirect("/admin/temoignages?error=invalid")
  }
  const supabase = await createClient()
  const patch: Record<string, unknown> = { status }
  if (status === "published") patch.published_at = new Date().toISOString()
  const { error } = await supabase.from("testimonials").update(patch).eq("id", id)
  if (error) redirect(`/admin/temoignages/${id}?error=${encodeURIComponent("Changement de statut impossible.")}`)
  await logAudit(supabase, editor.id, `testimonial.${status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish"}`, "testimonial", id)
  updateTag(TESTIMONIALS_TAG)
  redirect(`/admin/temoignages/${id}?${status === "published" ? "published" : status === "archived" ? "archived" : "unpublished"}=1`)
}

export async function deleteTestimonial(formData: FormData) {
  const editor = await requireEditor()
  const id = String(formData.get("id") ?? "")
  if (!z.uuid().safeParse(id).success) redirect("/admin/temoignages?error=invalid")
  const supabase = await createClient()
  const { error } = await supabase.from("testimonials").delete().eq("id", id).neq("status", "published")
  if (error) redirect(`/admin/temoignages/${id}?error=${encodeURIComponent("Suppression impossible.")}`)
  await logAudit(supabase, editor.id, "testimonial.delete", "testimonial", id)
  updateTag(TESTIMONIALS_TAG)
  redirect("/admin/temoignages?deleted=1")
}
