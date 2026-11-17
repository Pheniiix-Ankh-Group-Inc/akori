import type { PublicMedia, PublicationStatus } from "@/lib/events/types"

export interface StoryTranslation {
  locale: string
  title: string
  summary: string | null
  body: string | null
  seo_description: string | null
}

export interface StoryMediaLink {
  media_id: string
  position: number
  caption: Record<string, string>
}

export interface StoryRecord {
  id: string
  slug: string
  status: PublicationStatus
  event_id: string | null
  occurred_on: string | null
  cover_media_id: string | null
  featured_video_id: string | null
  published_at: string | null
  updated_at: string
  story_translations: StoryTranslation[]
  story_media: StoryMediaLink[]
}

export interface PublicTestimonial {
  id: string
  story_id: string | null
  event_id: string | null
  locale: string
  quote: string
  author_name: string
  author_role: string | null
  position: number
}

export interface StoryBundle {
  story: StoryRecord
  media: Record<string, PublicMedia>
  testimonials: PublicTestimonial[]
}

export const STORY_COLUMNS =
  "id, slug, status, event_id, occurred_on, cover_media_id, featured_video_id, published_at, updated_at, story_translations(locale, title, summary, body, seo_description), story_media(media_id, position, caption)"

export const MEDIA_LIMITS: Record<string, { mimes: string[]; maxBytes: number }> = {
  image: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 15 * 1024 * 1024 },
  poster: { mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 15 * 1024 * 1024 },
  video: { mimes: ["video/mp4"], maxBytes: 200 * 1024 * 1024 },
  subtitles: { mimes: ["text/vtt"], maxBytes: 1024 * 1024 },
}

export const CONSENT_LIMITS = { mimes: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 10 * 1024 * 1024 }
