import type { EventRecord, EventTiming } from "./types"

/**
 * Durée supposée d'un événement sans date de fin, utilisée UNIQUEMENT pour
 * calculer l'état « en cours ». Elle n'est jamais affichée au public.
 */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000

export function effectiveEnd(e: Pick<EventRecord, "starts_at" | "ends_at">): number {
  return e.ends_at ? Date.parse(e.ends_at) : Date.parse(e.starts_at) + DEFAULT_EVENT_DURATION_MS
}

/** Catégorie temporelle calculée depuis les dates (jamais saisie). */
export function eventTiming(e: Pick<EventRecord, "starts_at" | "ends_at">, now = Date.now()): EventTiming {
  const start = Date.parse(e.starts_at)
  if (now < start) return "upcoming"
  if (now <= effectiveEnd(e)) return "ongoing"
  return "past"
}

export function splitByTiming<T extends Pick<EventRecord, "starts_at" | "ends_at">>(events: T[], now = Date.now()) {
  const upcoming: T[] = []
  const ongoing: T[] = []
  const past: T[] = []
  for (const e of events) {
    const t = eventTiming(e, now)
    if (t === "upcoming") upcoming.push(e)
    else if (t === "ongoing") ongoing.push(e)
    else past.push(e)
  }
  upcoming.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  ongoing.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  past.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
  return { upcoming, ongoing, past }
}

/** Date et heure dans le fuseau de l'événement, avec le nom du fuseau. */
export function formatEventDate(iso: string, timeZone: string, intlLocale: string): string {
  try {
    // dateStyle/timeStyle ne peuvent pas être combinés avec timeZoneName.
    return new Intl.DateTimeFormat(intlLocale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(new Date(iso))
  } catch {
    // Fuseau invalide : on affiche l'heure UTC en le disant explicitement.
    return `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`
  }
}

export function formatEventDay(iso: string, timeZone: string, intlLocale: string): { month: string; day: string } {
  try {
    const d = new Date(iso)
    return {
      month: new Intl.DateTimeFormat(intlLocale, { month: "short", timeZone }).format(d),
      day: new Intl.DateTimeFormat(intlLocale, { day: "numeric", timeZone }).format(d),
    }
  } catch {
    return { month: "", day: "" }
  }
}
