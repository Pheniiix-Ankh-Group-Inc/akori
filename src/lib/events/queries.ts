import "server-only"
import { unstable_cache } from "next/cache"
import { getPublicClient } from "@/lib/supabase/public"
import { EVENT_COLUMNS, type EventRecord, type PublicMedia } from "./types"

export const EVENTS_TAG = "events"
export const MEDIA_TAG = "media"
const PAGE = 1000

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
    // Historique complet, lu par pages de 1 000 (plafond PostgREST) : aucune
    // limite arbitraire sur le nombre d'événements conservés.
    const events: EventRecord[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("status", "published")
        .order("starts_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1)
      if (error || !data) {
        console.error("[events] lecture publique impossible", error?.code)
        return { configured: true, events, media: {} }
      }
      events.push(...(data as unknown as EventRecord[]))
      if (data.length < PAGE) break
    }
    const media = await loadMedia(events.map((e) => e.cover_media_id ?? ""))
    return { configured: true, events, media }
  },
  ["public-events-v2"],
  { tags: [EVENTS_TAG, MEDIA_TAG], revalidate: 300 },
)

export async function getPublishedEventBySlug(slug: string) {
  const { configured, events, media } = await getPublishedEvents()
  const event = events.find((e) => e.slug === slug) ?? null
  return { configured, event, cover: event?.cover_media_id ? media[event.cover_media_id] ?? null : null }
}
