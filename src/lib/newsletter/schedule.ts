import { zonedLocalToUtcIso, zonedParts } from "@/lib/time"

/** Calendrier éditorial : fuseau America/Toronto, heure d'été comprise. */
export const NEWSLETTER_TZ = "America/Toronto"
/** Fenêtre d'envoi : mercredi 09:00 → 09:59, heure de Toronto. */
export const SEND_WINDOW_MINUTES = 60

const pad = (n: number) => String(n).padStart(2, "0")

/** Lundi (date locale Toronto, AAAA-MM-JJ) de la semaine contenant `now`. */
export function weekStartFor(now: Date): string {
  const p = zonedParts(now, NEWSLETTER_TZ)
  const local = Date.UTC(p.year, p.month - 1, p.day) - (p.weekday - 1) * 86400000
  const d = new Date(local)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Instant UTC du créneau d'envoi : mercredi 09:00 heure de Toronto. */
export function sendSlotFor(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number)
  const wed = new Date(Date.UTC(y, m - 1, d + 2))
  const local = `${wed.getUTCFullYear()}-${pad(wed.getUTCMonth() + 1)}-${pad(wed.getUTCDate())}T09:00`
  const iso = zonedLocalToUtcIso(local, NEWSLETTER_TZ)
  if (!iso) throw new Error("Calcul du créneau d'envoi impossible.")
  return iso
}

export type SendWindowState = "before" | "open" | "closed"

export function sendWindowState(now: Date, sendSlotIso: string): SendWindowState {
  const slot = Date.parse(sendSlotIso)
  if (now.getTime() < slot) return "before"
  if (now.getTime() < slot + SEND_WINDOW_MINUTES * 60000) return "open"
  return "closed"
}

/** Jour de la semaine à Toronto (1 = lundi … 7 = dimanche). */
export const torontoWeekday = (now: Date) => zonedParts(now, NEWSLETTER_TZ).weekday
