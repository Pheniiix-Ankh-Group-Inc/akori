import "server-only"
import { unstable_cache } from "next/cache"
import { getPublicClient } from "@/lib/supabase/public"
import { EVENT_COLUMNS, type EventRecord, type PublicMedia } from "./types"

export const EVENTS_TAG = "events"
export const MEDIA_TAG = "media"

export interface PublicEventsResult {
  configured: boolean
  events: EventRecord[]
  media: Record<string, PublicMedia>
}

async function loadMedia(ids: string[]): Promise<Record<string, PublicMedia>> {
  const supabase = getPublicClient()
  const unique = [...new Set(ids.filter(Boolean))]
  if (!supabase || unique.length === 0) return {}
  const { data, error } = await supabase.from("media_public").select("*").in("id", unique)
  if (error || !data) return {}
  return Object.fromEntries((data as PublicMedia[]).map((m) => [m.id, m]))
}

/**
 * Événements publiés (à venir, en cours et passés), lus via RLS `anon`.
 * Si Supabase BIB n'est pas configuré, renvoie un résultat vide explicite.
 */
export const getPublishedEvents = unstable_cache(
  async (): Promise<PublicEventsResult> => {
    const supabase = getPublicClient()
    if (!supabase) return { configured: false, events: [], media: {} }
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("status", "published")
      .order("starts_at", { ascending: false })
      .limit(200)
    if (error || !data) {
      console.error("[events] lecture publique impossible", error?.code)
      return { configured: true, events: [], media: {} }
    }
    const events = data as unknown as EventRecord[]
    const media = await loadMedia(events.map((e) => e.cover_media_id ?? ""))
    return { configured: true, events, media }
  },
  ["public-events-v1"],
  { tags: [EVENTS_TAG, MEDIA_TAG], revalidate: 300 },
)

export async function getPublishedEventBySlug(slug: string) {
  const { configured, events, media } = await getPublishedEvents()
  const event = events.find((e) => e.slug === slug) ?? null
  return { configured, event, cover: event?.cover_media_id ? media[event.cover_media_id] ?? null : null }
}
