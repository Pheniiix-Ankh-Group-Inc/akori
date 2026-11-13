export type PublicationStatus = "draft" | "published" | "archived"
export type EventMode = "in_person" | "online" | "hybrid"
export type EventTiming = "upcoming" | "ongoing" | "past"

export interface EventTranslation {
  locale: string
  title: string
  summary: string | null
  description: string | null
}

export interface EventRecord {
  id: string
  slug: string
  status: PublicationStatus
  starts_at: string
  ends_at: string | null
  time_zone: string
  mode: EventMode
  venue_name: string | null
  address: string | null
  city: string | null
  country_code: string | null
  online_url: string | null
  luma_url: string | null
  cover_media_id: string | null
  published_at: string | null
  archived_at: string | null
  updated_at: string
  event_translations: EventTranslation[]
}

export interface PublicMedia {
  id: string
  kind: "image" | "video" | "poster" | "subtitles"
  public_path: string
  mime_type: string
  width: number | null
  height: number | null
  duration_seconds: number | null
  alt_text: Record<string, string>
  credit: string | null
  poster_media_id: string | null
  subtitles_media_id: string | null
}

export const EVENT_COLUMNS =
  "id, slug, status, starts_at, ends_at, time_zone, mode, venue_name, address, city, country_code, online_url, luma_url, cover_media_id, published_at, archived_at, updated_at, event_translations(locale, title, summary, description)"
