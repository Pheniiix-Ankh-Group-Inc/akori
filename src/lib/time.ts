/**
 * Conversions fuseau horaire sans dépendance : utilisées pour saisir une
 * date locale d'événement (dans son fuseau IANA) et pour le calendrier
 * éditorial (America/Toronto, heure d'été comprise).
 */

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: number // 1 = lundi … 7 = dimanche
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0"
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
  }
}

/** Décalage (ms) du fuseau par rapport à UTC à l'instant donné. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - (date.getTime() - date.getMilliseconds())
}

/** "2026-12-12T18:30" interprété dans `timeZone` → instant UTC (ISO). */
export function zonedLocalToUtcIso(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m || !isValidTimeZone(timeZone)) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  let utc = guess - offsetMs(new Date(guess), timeZone)
  // Seconde passe pour les changements d'heure.
  utc = guess - offsetMs(new Date(utc), timeZone)
  return new Date(utc).toISOString()
}

/** Instant UTC → "YYYY-MM-DDTHH:mm" dans `timeZone` (champ datetime-local). */
export function utcIsoToZonedLocal(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** Date calendaire (YYYY-MM-DD) dans un fuseau. */
export function zonedDate(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}
