import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { listMediaOptions } from "@/lib/admin/queries"
import { listEventOptions } from "@/lib/admin/options"
import { StoryForm } from "@/components/admin/StoryForm"

export const metadata: Metadata = { title: "Nouvelle rétrospective" }

export default async function NewStoryPage() {
  await requireEditor()
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
        values={{ slug: "", occurred_on: "", event_id: "", cover_media_id: "", featured_video_id: "", translations: {} }}
      />
    </>
  )
}
