import type { EventRecord } from "./types"

/** No guessed links: show a spotlight date only for a confirmed, live event. */
const SPOTLIGHT_TITLE = /startup[ -]?spotlight|founder stor(?:y|ies)|fondateur(?:s)? à l'honneur|historia de fundadores/i

export function selectSpotlightEvent(
  events: readonly EventRecord[],
  locale: string,
  now: number = Date.now(),
): EventRecord | null {
  return events
    .filter((event) => {
      if (event.source_status === "cancelled" || event.source_status === "tentative") return false
      const start = Date.parse(event.starts_at)
      const end = event.ends_at ? Date.parse(event.ends_at) : start
      if (!Number.isFinite(start) || !Number.isFinite(end) || Math.max(start, end) < now) return false
      const titles = [
        event.source_title ?? "",
        ...event.event_translations.map((translation) => translation.title),
      ]
      // Search all languages, not just the language displayed in the visitor's UI.
      void locale
      return titles.some((title) => SPOTLIGHT_TITLE.test(title))
    })
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0] ?? null
}

/** Bad imported time-zone values must never crash the whole Spotlight page. */
export function formatSpotlightDate(event: Pick<EventRecord, "starts_at" | "time_zone">, locale: string): string | null {
  const date = new Date(event.starts_at)
  if (!Number.isFinite(date.getTime())) return null
  const options: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short", timeZone: event.time_zone }
  try {
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date) + " UTC"
  }
}
