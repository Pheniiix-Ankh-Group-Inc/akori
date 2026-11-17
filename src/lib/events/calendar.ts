import type { EventRecord, EventTiming } from "./types"
import { eventTiming } from "./temporal"

export const EVENT_VIEWS = ["liste", "mois"] as const
export const EVENT_STATUSES = ["tous", "a-venir", "en-cours", "passes"] as const
export type EventView = (typeof EVENT_VIEWS)[number]
export type EventStatusFilter = (typeof EVENT_STATUSES)[number]
export const PAST_PAGE_SIZE = 24

const STATUS_TO_TIMING: Record<Exclude<EventStatusFilter, "tous">, EventTiming> = { "a-venir": "upcoming", "en-cours": "ongoing", passes: "past" }

export interface EventFilters {
  view: EventView
  status: EventStatusFilter
  month: string // AAAA-MM
  year: number | null
  page: number
}

/** Paramètres d'URL validés (toute valeur inconnue revient au défaut). */
export function parseEventFilters(sp: Record<string, string | string[] | undefined>, now = new Date(), tz = "America/Toronto"): EventFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined))
  const view = (EVENT_VIEWS as readonly string[]).includes(one("vue") ?? "") ? (one("vue") as EventView) : "liste"
  const status = (EVENT_STATUSES as readonly string[]).includes(one("statut") ?? "") ? (one("statut") as EventStatusFilter) : "tous"
  const m = one("mois")
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : localMonth(now, tz)
  const y = Number(one("annee"))
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : null
  const p = Number(one("page"))
  const page = Number.isInteger(p) && p >= 1 && p <= 10_000 ? p : 1
  return { view, status, month, year, page }
}

export function localMonth(d: Date, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(d)
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`
}

/** Date locale AAAA-MM-JJ d'un instant, dans le fuseau donné. */
export function localDay(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function filterByStatus<T extends Pick<EventRecord, "starts_at" | "ends_at">>(events: T[], status: EventStatusFilter, now = Date.now()): T[] {
  if (status === "tous") return events
  const t = STATUS_TO_TIMING[status]
  return events.filter((e) => eventTiming(e, now) === t)
}

export function yearsOf<T extends Pick<EventRecord, "starts_at" | "time_zone">>(events: T[]): number[] {
  return [...new Set(events.map((e) => Number(localDay(e.starts_at, e.time_zone).slice(0, 4))))].sort((a, b) => b - a)
}

export interface CalendarDay<T> {
  date: string // AAAA-MM-JJ
  inMonth: boolean
  events: T[]
}

/**
 * Grille mensuelle (semaines du lundi au dimanche). Chaque événement est placé
 * à sa date locale (fuseau de l'événement) ; un événement sur plusieurs jours
 * apparaît chaque jour de sa durée dans le mois affiché.
 */
export function monthGrid<T extends Pick<EventRecord, "starts_at" | "ends_at" | "time_zone">>(month: string, events: T[]): CalendarDay<T>[][] {
  const [y, m] = month.split("-").map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7 // lundi = 0
  const start = new Date(Date.UTC(y, m - 1, 1 - offset))
  const byDay = new Map<string, T[]>()
  for (const e of events) {
    const d0 = localDay(e.starts_at, e.time_zone)
    const d1 = e.ends_at ? localDay(e.ends_at, e.time_zone) : d0
    let cur = new Date(`${d0}T00:00:00Z`)
    const end = new Date(`${d1 < d0 ? d0 : d1}T00:00:00Z`)
    for (let guard = 0; cur <= end && guard < 62; guard++) {
      const key = cur.toISOString().slice(0, 10)
      byDay.set(key, [...(byDay.get(key) ?? []), e])
      cur = new Date(cur.getTime() + 86_400_000)
    }
  }
  const weeks: CalendarDay<T>[][] = []
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay<T>[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start.getTime() + (w * 7 + d) * 86_400_000)
      const key = day.toISOString().slice(0, 10)
      week.push({ date: key, inMonth: day.getUTCMonth() === m - 1, events: (byDay.get(key) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at)) })
    }
    if (w >= 4 && week.every((x) => !x.inMonth)) break
    weeks.push(week)
  }
  return weeks
}

export function paginate<T>(items: T[], page: number, size = PAST_PAGE_SIZE): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const p = Math.min(Math.max(1, page), pages)
  return { items: items.slice((p - 1) * size, p * size), page: p, pages }
}
