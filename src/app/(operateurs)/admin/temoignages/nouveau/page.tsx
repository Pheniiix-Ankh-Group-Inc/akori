import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { listEventOptions, listStoryOptions } from "@/lib/admin/options"
import { TestimonialForm } from "@/components/admin/TestimonialForm"
import { Notice } from "@/components/admin/Notice"

export const metadata: Metadata = { title: "Nouveau témoignage" }

export default async function NewTestimonialPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const params = await searchParams
  const [stories, events] = await Promise.all([listStoryOptions(), listEventOptions()])
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/temoignages">Témoignages</Link> › Nouveau</p>
          <h1>Nouveau témoignage</h1>
        </div>
      </div>
      <Notice params={params} />
      <TestimonialForm
        stories={stories}
        events={events}
        values={{ story_id: "", event_id: "", locale: "fr", quote: "", author_name: "", author_role: "", consent_reference: "", position: 0 }}
      />
    </>
  )
}
