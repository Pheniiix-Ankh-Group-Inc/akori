import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { STORY_COLUMNS, type PublicTestimonial, type StoryRecord } from "@/lib/stories/types"
import { createDraftPreviewUrls } from "@/lib/media/preview"
import { pickLocalized } from "@/lib/content/locales"
import { StoryDetail } from "@/components/en-action/StoryDetail"
import type { MediaView } from "@/components/en-action/types"

export const dynamic = "force-dynamic"

type MediaRow = { id: string; kind: string; mime_type: string; width: number | null; height: number | null; alt_text: Record<string, string>; credit: string | null; poster_media_id: string | null; subtitles_media_id: string | null }

/** Aperçu privé : médias servis par URL signées de courte durée. */
export default async function StoryPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  await requireEditor()
  const { id } = await params
  const { lang } = await searchParams
  const locale = lang === "en" || lang === "es" ? lang : "fr"
  if (!z.uuid().safeParse(id).success) notFound()
  const supabase = await createClient()
  const { data } = await supabase.from("stories").select(STORY_COLUMNS).eq("id", id).maybeSingle()
  if (!data) notFound()
  const story = data as unknown as StoryRecord

  const ids = [story.cover_media_id, story.featured_video_id, ...story.story_media.map((m) => m.media_id)].filter((x): x is string => !!x)
  const { data: mediaData } = ids.length ? await supabase.from("media_assets").select("id, kind, mime_type, width, height, alt_text, credit, poster_media_id, subtitles_media_id").in("id", ids) : { data: [] }
  const rows = (mediaData ?? []) as MediaRow[]
  const companionIds = rows.flatMap((r) => [r.poster_media_id, r.subtitles_media_id]).filter((x): x is string => !!x)
  const urls = await createDraftPreviewUrls([...ids, ...companionIds])
  const media: Record<string, MediaView> = {}
  for (const r of rows) {
    if (!urls[r.id]) continue
    media[r.id] = {
      id: r.id,
      kind: r.kind,
      url: urls[r.id],
      mime_type: r.mime_type,
      width: r.width,
      height: r.height,
      alt: pickLocalized(r.alt_text, locale),
      credit: r.credit,
      posterUrl: r.poster_media_id ? urls[r.poster_media_id] ?? null : null,
      subtitlesUrl: r.subtitles_media_id ? urls[r.subtitles_media_id] ?? null : null,
    }
  }
  const { data: tData } = await supabase
    .from("testimonials")
    .select("id, story_id, event_id, locale, quote, author_name, author_role, position")
    .eq("story_id", story.id)
    .order("position")

  return (
    <>
      <p className="adm-notice">
        Aperçu privé ({story.status}) ·{" "}
        {(["fr", "en", "es"] as const).map((l) => (
          <Link key={l} href={`?lang=${l}`} style={{ marginRight: "0.75rem" }}>{l.toUpperCase()}</Link>
        ))}
        · <Link href={`/admin/en-action/${story.id}`}>Retour à l&apos;édition</Link>
      </p>
      <StoryDetail story={story} locale={locale} media={media} testimonials={(tData ?? []) as PublicTestimonial[]} />
    </>
  )
}
