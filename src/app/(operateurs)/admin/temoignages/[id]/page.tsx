import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { listEventOptions, listStoryOptions } from "@/lib/admin/options"
import { TestimonialForm } from "@/components/admin/TestimonialForm"
import { Notice, StatusBadge } from "@/components/admin/Notice"
import { deleteTestimonial, setTestimonialStatus } from "../actions"

export const metadata: Metadata = { title: "Témoignage" }

type Row = { id: string; story_id: string | null; event_id: string | null; locale: string; quote: string; author_name: string; author_role: string | null; consent_reference: string; position: number; status: string }

export default async function TestimonialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const query = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("testimonials").select("*").eq("id", id).maybeSingle()
  if (!data) notFound()
  const t = data as Row
  const [stories, events] = await Promise.all([listStoryOptions(), listEventOptions()])

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/temoignages">Témoignages</Link> › Modifier</p>
          <h1>{t.author_name}</h1>
          <p className="adm-muted"><StatusBadge status={t.status} /></p>
        </div>
        <div className="adm-actions">
          {t.status !== "published" && (
            <form action={setTestimonialStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="published" /><button className="adm-btn adm-btn-primary">Publier</button></form>
          )}
          {t.status === "published" && (
            <form action={setTestimonialStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="draft" /><button className="adm-btn">Retirer du site</button></form>
          )}
          {t.status !== "published" && (
            <form action={deleteTestimonial}><input type="hidden" name="id" value={t.id} /><button className="adm-btn adm-btn-danger">Supprimer</button></form>
          )}
        </div>
      </div>
      <Notice params={query} />
      <TestimonialForm
        stories={stories}
        events={events}
        values={{
          id: t.id,
          story_id: t.story_id ?? "",
          event_id: t.event_id ?? "",
          locale: t.locale,
          quote: t.quote,
          author_name: t.author_name,
          author_role: t.author_role ?? "",
          consent_reference: t.consent_reference,
          position: t.position,
        }}
      />
    </>
  )
}
