import "server-only"
import { unstable_cache } from "next/cache"
import { getPublicClient } from "@/lib/supabase/public"
import type { PublicMedia } from "@/lib/events/types"
import { MEDIA_TAG } from "@/lib/events/queries"
import { STORY_COLUMNS, type PublicTestimonial, type StoryRecord } from "./types"

export const STORIES_TAG = "stories"
export const TESTIMONIALS_TAG = "testimonials"

export interface PublicStoriesResult {
  configured: boolean
  stories: StoryRecord[]
  media: Record<string, PublicMedia>
  testimonials: PublicTestimonial[]
}

/**
 * Rétrospectives publiées, médias publics approuvés et témoignages publiés.
 * Un média n'apparaît que s'il est présent dans la vue media_public
 * (copie publique + droits approuvés).
 */
export const getPublishedStories = unstable_cache(
  async (): Promise<PublicStoriesResult> => {
    const supabase = getPublicClient()
    if (!supabase) return { configured: false, stories: [], media: {}, testimonials: [] }

    const [storiesRes, testimonialsRes] = await Promise.all([
      supabase.from("stories").select(STORY_COLUMNS).eq("status", "published").order("occurred_on", { ascending: false, nullsFirst: false }).limit(200),
      supabase.from("testimonials_public").select("*").order("position", { ascending: true }).limit(200),
    ])
    if (storiesRes.error) {
      console.error("[stories] lecture publique impossible", storiesRes.error.code)
      return { configured: true, stories: [], media: {}, testimonials: [] }
    }
    const stories = (storiesRes.data ?? []) as unknown as StoryRecord[]
    const ids = new Set<string>()
    for (const s of stories) {
      if (s.cover_media_id) ids.add(s.cover_media_id)
      if (s.featured_video_id) ids.add(s.featured_video_id)
      for (const m of s.story_media) ids.add(m.media_id)
    }
    let media: Record<string, PublicMedia> = {}
    if (ids.size) {
      const { data } = await supabase.from("media_public").select("*").in("id", [...ids])
      const rows = (data ?? []) as PublicMedia[]
      // Affiches et sous-titres liés aux vidéos.
      const extra = rows.flatMap((m) => [m.poster_media_id, m.subtitles_media_id]).filter((x): x is string => !!x && !ids.has(x))
      if (extra.length) {
        const { data: more } = await supabase.from("media_public").select("*").in("id", extra)
        rows.push(...((more ?? []) as PublicMedia[]))
      }
      media = Object.fromEntries(rows.map((m) => [m.id, m]))
    }
    return { configured: true, stories, media, testimonials: (testimonialsRes.data ?? []) as PublicTestimonial[] }
  },
  ["public-stories-v1"],
  { tags: [STORIES_TAG, TESTIMONIALS_TAG, MEDIA_TAG], revalidate: 300 },
)

export async function getPublishedStoryBySlug(slug: string) {
  const all = await getPublishedStories()
  const story = all.stories.find((s) => s.slug === slug) ?? null
  return {
    configured: all.configured,
    story,
    media: all.media,
    testimonials: story ? all.testimonials.filter((t) => t.story_id === story.id) : [],
  }
}
