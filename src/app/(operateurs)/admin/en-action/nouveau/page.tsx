import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { listMediaOptions } from "@/lib/admin/queries"
import { listEventOptions } from "@/lib/admin/options"
import { StoryForm } from "@/components/admin/StoryForm"

export const metadata: Metadata = { title: "Nouvelle rétrospective" }

export default async function NewStoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  // Pré-sélection de l'événement lié (depuis la fiche d'un événement Luma).
  const wanted = (await searchParams).event ?? ""
  const [images, videos, events] = await Promise.all([listMediaOptions(["image"]), listMediaOptions(["video"]), listEventOptions()])
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/en-action">BIB en action</Link> › Nouvelle</p>
          <h1>Nouvelle rétrospective</h1>
        </div>
      </div>
      <StoryForm
        images={images}
        videos={videos}
        events={events}
        values={{ slug: "", occurred_on: "", event_id: /^[0-9a-f-]{36}$/i.test(wanted) && events.some((e) => e.id === wanted) ? wanted : "", cover_media_id: "", featured_video_id: "", translations: {} }}
      />
    </>
  )
}
