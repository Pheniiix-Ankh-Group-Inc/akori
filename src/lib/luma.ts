/**
 * Lu.ma integration
 * Free plan  → données Sanity + iframe embed
 * Paid plan  → API Lu.ma (décommenter quand disponible)
 */

export interface LumaEvent {
  id:          string
  title:       string
  startAt:     string
  endAt?:      string
  location?:   string
  coverUrl?:   string
  url:         string
  price?:      string
  type?:       string
}

// ── Plan payant (futur) ──────────────────────────────────
// export async function fetchLumaEvents(): Promise<LumaEvent[]> {
//   const res = await fetch("https://api.lu.ma/public/v1/calendar/list-events", {
//     headers: {
//       "x-luma-api-key": process.env.LUMA_API_KEY!,
//     },
//     next: { revalidate: 3600 }, // cache 1h
//   })
//   if (!res.ok) throw new Error("Lu.ma API error")
//   const data = await res.json()
//   return data.entries.map((e: any) => ({
//     id:       e.event.api_id,
//     title:    e.event.name,
//     startAt:  e.event.start_at,
//     endAt:    e.event.end_at,
//     location: e.event.geo_address_info?.full_address,
//     coverUrl: e.event.cover_url,
//     url:      `https://lu.ma/${e.event.url}`,
//     price:    e.event.ticket_info?.is_free ? "Free" : e.event.ticket_info?.price,
//   }))
// }

// ── Plan gratuit (actuel) ─────────────────────────────────
// On utilise les données Sanity + l'URL Lu.ma pour le bouton d'inscription
export function getLumaEmbedUrl(calendarId: string): string {
  return `https://lu.ma/embed/calendar/${calendarId}/events`
}

export function getLumaEventUrl(slug: string): string {
  return `https://lu.ma/${slug}`
}

// Tri automatique : événements futurs en premier
export function sortEventsByDate<T extends { date: string }>(events: T[]): T[] {
  const now = new Date()
  return [...events]
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}