/**
 * Lecture d'un flux iCalendar (RFC 5545) publié par Luma.
 *
 * Sans dépendance : dépliage des lignes, paramètres, échappements, dates
 * (UTC, locales avec TZID, flottantes, journées entières), STATUS, SEQUENCE,
 * LAST-MODIFIED, URL, LOCATION, GEO, ATTACH (image), RRULE / EXDATE /
 * RECURRENCE-ID (occurrences développées, bornées). Aucune donnée privée :
 * les propriétés ATTENDEE/ORGANIZER (participants) sont ignorées.
 */

export interface IcalProperty {
  name: string
  params: Record<string, string>
  value: string
}

export interface IcalEvent {
  uid: string
  /** UID de la série pour une occurrence développée d'un événement récurrent. */
  recurrenceUid: string | null
  summary: string
  description: string | null
  location: string | null
  url: string | null
  imageUrl: string | null
  status: "confirmed" | "tentative" | "cancelled"
  sequence: number | null
  lastModified: string | null
  /** Début et fin en ISO UTC. */
  start: string
  end: string | null
  allDay: boolean
  timeZone: string | null
  rrule: string | null
  geo: { lat: number; lon: number } | null
}

export interface IcalCalendar {
  name: string | null
  timeZone: string | null
  events: IcalEvent[]
  warnings: string[]
}

export class IcalError extends Error {}

/**
 * Bornes explicites du développement des séries récurrentes :
 *  · tout le PASSÉ est développé depuis DTSTART (l'historique n'est jamais
 *    tronqué par une fenêtre glissante) ;
 *  · le FUTUR est développé jusqu'à RECURRENCE_HORIZON_DAYS après « maintenant »
 *    (une série sans fin n'a pas de dernier événement : l'horizon avance à
 *    chaque synchronisation) ;
 *  · MAX_OCCURRENCES est un garde-fou technique par série ; s'il est atteint,
 *    un avertissement explicite est journalisé (jamais de troncature muette).
 */
export const MAX_OCCURRENCES = 5000
export const RECURRENCE_HORIZON_DAYS = 730

/** Dépliage RFC 5545 §3.1 (CRLF suivi d'un espace ou d'une tabulation). */
export function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n").filter((l) => l.length > 0)
}

/** Découpe « NOM;P1=v;P2="a:b":valeur » en respectant les guillemets. */
export function parseLine(line: string): IcalProperty | null {
  let i = 0
  let inQuote = false
  let colon = -1
  for (; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuote = !inQuote
    else if (c === ":" && !inQuote) {
      colon = i
      break
    }
  }
  if (colon < 0) return null
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const parts: string[] = []
  let buf = ""
  inQuote = false
  for (const c of head) {
    if (c === '"') inQuote = !inQuote
    if (c === ";" && !inQuote) {
      parts.push(buf)
      buf = ""
    } else buf += c
  }
  parts.push(buf)
  const name = parts.shift()!.toUpperCase()
  const params: Record<string, string> = {}
  for (const p of parts) {
    const eq = p.indexOf("=")
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "")
  }
  return { name, params, value }
}

/** Désechappement des valeurs TEXT (\\n, \\, , \\; , \\\\). */
export function unescapeText(v: string): string {
  return v.replace(/\\([\\;,nN])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c))
}

/** Décalage (minutes) du fuseau `tz` à l'instant UTC donné. */
function tzOffsetMinutes(tz: string, utcMs: number): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  return Math.round((asUtc - utcMs) / 60000)
}

/** Heure murale dans `tz` → instant UTC (gère les changements d'heure). */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s)
  let guess = wall - tzOffsetMinutes(tz, wall) * 60000
  // Deux itérations suffisent, y compris autour d'un changement d'heure.
  guess = wall - tzOffsetMinutes(tz, guess) * 60000
  return guess
}

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(tz)) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Date iCal → { ms UTC, journée entière }. */
export function parseIcalDate(prop: IcalProperty, fallbackTz: string | null): { ms: number; allDay: boolean; tz: string | null } {
  const v = prop.value.trim()
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v)
  if (dateOnly || prop.params.VALUE === "DATE") {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(v)
    if (!m) throw new IcalError(`date invalide : ${v}`)
    return { ms: Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])), allDay: true, tz: null }
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v)
  if (!m) throw new IcalError(`date-heure invalide : ${v}`)
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number)
  if (m[7]) return { ms: Date.UTC(y, mo - 1, d, h, mi, s), allDay: false, tz: null }
  const tz = isValidTimeZone(prop.params.TZID) ? prop.params.TZID : isValidTimeZone(fallbackTz) ? fallbackTz : null
  // Heure flottante sans fuseau connu : interprétée en UTC (signalé).
  if (!tz) return { ms: Date.UTC(y, mo - 1, d, h, mi, s), allDay: false, tz: null }
  return { ms: zonedToUtc(y, mo, d, h, mi, s, tz), allDay: false, tz }
}

const HTTPS = /^https:\/\/[^\s<>"']+$/

function firstHttps(text: string | null): string | null {
  if (!text) return null
  const m = /https:\/\/(?:www\.)?(?:lu\.ma|luma\.com)\/[A-Za-z0-9._~/-]+/.exec(text)
  return m ? m[0] : null
}

interface RawEvent {
  props: IcalProperty[]
}

function get(ev: RawEvent, name: string): IcalProperty | undefined {
  return ev.props.find((p) => p.name === name)
}
function all(ev: RawEvent, name: string): IcalProperty[] {
  return ev.props.filter((p) => p.name === name)
}

interface Rrule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  interval: number
  count: number | null
  until: number | null
  byday: string[] | null
  bydayOrd?: { ord: number; dow: number }[] | null
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
// Parties de règle non prises en charge : la série n'est pas développée
// (première occurrence seule + avertissement) plutôt que mal calculée.
const UNSUPPORTED_PARTS = ["BYSETPOS", "BYYEARDAY", "BYWEEKNO", "BYHOUR", "BYMINUTE", "BYSECOND", "BYMONTH", "BYMONTHDAY"]

export function parseRrule(v: string): Rrule | null {
  const parts = Object.fromEntries(v.split(";").map((kv) => kv.split("=") as [string, string]).filter((x) => x.length === 2).map(([k, val]) => [k.toUpperCase(), val]))
  const freq = parts.FREQ as Rrule["freq"]
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null
  if (UNSUPPORTED_PARTS.some((k) => k in parts)) return null
  let until: number | null = null
  if (parts.UNTIL) {
    try {
      until = parseIcalDate({ name: "UNTIL", params: {}, value: parts.UNTIL }, "UTC").ms
    } catch {
      return null
    }
  }
  let byday: string[] | null = null
  let bydayOrd: { ord: number; dow: number }[] | null = null
  if (parts.BYDAY) {
    const items = parts.BYDAY.split(",").map((d) => /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(d.trim().toUpperCase()))
    if (items.some((m) => !m)) return null
    const withOrd = items.filter((m) => m![1])
    if (withOrd.length && withOrd.length !== items.length) return null
    if (withOrd.length) {
      // « 2TU », « -1FR » : nième jour de la semaine du mois (MONTHLY uniquement).
      if (freq !== "MONTHLY") return null
      bydayOrd = items.map((m) => ({ ord: Number(m![1]), dow: DAY_CODES.indexOf(m![2]) }))
      if (bydayOrd.some((b) => b.ord === 0 || Math.abs(b.ord) > 5)) return null
    } else {
      // BYDAY sans rang n'a de sens ici que pour WEEKLY.
      if (freq !== "WEEKLY") return null
      byday = items.map((m) => m![2])
    }
  }
  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1),
    count: parts.COUNT ? Math.max(1, Number(parts.COUNT) || 1) : null,
    until,
    byday,
    bydayOrd,
  }
}

export interface Expansion {
  occurrences: number[]
  /** null : série complète ; "horizon" : futur borné ; "cap" : garde-fou atteint. */
  truncated: null | "horizon" | "cap"
}

/**
 * Occurrences d'une règle (DAILY, WEEKLY avec BYDAY, MONTHLY par quantième ou
 * par nième jour de semaine, YEARLY), calculées en heure murale du fuseau pour
 * respecter les changements d'heure. Bornées par COUNT, UNTIL, l'horizon futur
 * et le garde-fou : jamais infinies, et toute troncature est signalée.
 */
export function expandRruleDetailed(startMs: number, tz: string | null, rule: Rrule, now: number): Expansion {
  const horizon = Math.max(now, startMs) + RECURRENCE_HORIZON_DAYS * 86_400_000
  const out: number[] = []
  let truncated: Expansion["truncated"] = null
  const zone = tz ?? "UTC"
  const wallParts = (ms: number) => {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" })
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    return { y: Number(p.year), mo: Number(p.month), d: Number(p.day), h: Number(p.hour), mi: Number(p.minute), s: Number(p.second) }
  }
  const w = wallParts(startMs)
  const at = (y: number, mo: number, d: number) => zonedToUtc(y, mo, d, w.h, w.mi, w.s, zone)
  const push = (ms: number) => {
    if (ms < startMs) return true
    if (rule.until !== null && ms > rule.until) return false
    if (ms > horizon) {
      truncated = "horizon"
      return false
    }
    out.push(ms)
    if (rule.count !== null && out.length >= rule.count) return false
    if (out.length >= MAX_OCCURRENCES) {
      truncated = "cap"
      return false
    }
    return true
  }
  // Nième jour de semaine d'un mois (rang négatif : depuis la fin). null s'il n'existe pas.
  const nthWeekday = (y: number, mo: number, ord: number, dow: number): number | null => {
    const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate()
    if (ord > 0) {
      const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay()
      const d = 1 + ((dow - first + 7) % 7) + (ord - 1) * 7
      return d <= dim ? d : null
    }
    const last = new Date(Date.UTC(y, mo - 1, dim)).getUTCDay()
    const d = dim - ((last - dow + 7) % 7) + (ord + 1) * 7
    return d >= 1 ? d : null
  }
  for (let k = 0; k < MAX_OCCURRENCES * 7; k++) {
    if (rule.freq === "DAILY") {
      const base = new Date(Date.UTC(w.y, w.mo - 1, w.d + k * rule.interval))
      if (!push(at(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()))) break
    } else if (rule.freq === "WEEKLY") {
      const weekStart = new Date(Date.UTC(w.y, w.mo - 1, w.d + k * 7 * rule.interval))
      const startDow = new Date(Date.UTC(w.y, w.mo - 1, w.d)).getUTCDay()
      const days = rule.byday?.length ? rule.byday.map((c) => DAY_CODES.indexOf(c)).filter((x) => x >= 0) : [startDow]
      // Jours rangés à partir du jour de début (semaine glissante depuis DTSTART).
      const deltas = [...new Set(days.map((dow) => (dow - startDow + 7) % 7))].sort((a, b) => a - b)
      let cont = true
      for (const delta of deltas) {
        const day = new Date(weekStart.getTime() + delta * 86_400_000)
        if (!push(at(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()))) {
          cont = false
          break
        }
      }
      if (!cont) break
    } else if (rule.freq === "MONTHLY") {
      const total = w.mo - 1 + k * rule.interval
      const y = w.y + Math.floor(total / 12)
      const mo = (total % 12) + 1
      if (rule.bydayOrd?.length) {
        const days = rule.bydayOrd.map((b) => nthWeekday(y, mo, b.ord, b.dow)).filter((d): d is number => d !== null).sort((a, b) => a - b)
        let cont = true
        for (const d of [...new Set(days)]) {
          if (!push(at(y, mo, d))) {
            cont = false
            break
          }
        }
        if (!cont) break
        continue
      }
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate()
      if (w.d > dim) continue // jour inexistant ce mois-ci : occurrence ignorée (RFC 5545)
      if (!push(at(y, mo, w.d))) break
    } else {
      const y = w.y + k * rule.interval
      const dim = new Date(Date.UTC(y, w.mo, 0)).getUTCDate()
      if (w.d > dim) continue
      if (!push(at(y, w.mo, w.d))) break
    }
  }
  return { occurrences: out, truncated }
}

export const expandRrule = (startMs: number, tz: string | null, rule: Rrule, now: number): number[] =>
  expandRruleDetailed(startMs, tz, rule, now).occurrences

/** Analyse complète d'un flux. Lève IcalError si ce n'est pas un VCALENDAR. */
export function parseIcal(text: string, now: number = Date.now()): IcalCalendar {
  const lines = unfold(text.replace(/^﻿/, ""))
  if (!lines.length || lines[0].trim().toUpperCase() !== "BEGIN:VCALENDAR") throw new IcalError("pas un flux iCalendar (BEGIN:VCALENDAR absent)")
  if (!lines.some((l) => l.trim().toUpperCase() === "END:VCALENDAR")) throw new IcalError("flux tronqué (END:VCALENDAR absent)")

  const warnings: string[] = []
  const raws: RawEvent[] = []
  let calName: string | null = null
  let calTz: string | null = null
  let current: RawEvent | null = null
  let depth = 0 // composants imbriqués (VALARM…) ignorés
  for (const line of lines) {
    const p = parseLine(line)
    if (!p) continue
    if (p.name === "BEGIN") {
      if (p.value.toUpperCase() === "VEVENT" && !current) current = { props: [] }
      else if (current) depth++
      continue
    }
    if (p.name === "END") {
      if (current && depth > 0) depth--
      else if (current && p.value.toUpperCase() === "VEVENT") {
        raws.push(current)
        current = null
      }
      continue
    }
    if (current) {
      if (depth === 0) current.props.push(p)
    } else if (p.name === "X-WR-CALNAME") calName = unescapeText(p.value)
    else if (p.name === "X-WR-TIMEZONE" && isValidTimeZone(p.value.trim())) calTz = p.value.trim()
  }

  if (current) throw new IcalError("flux tronqué (VEVENT non terminé)")

  const events: IcalEvent[] = []
  const overrides = new Map<string, IcalEvent>()
  const masters: { ev: IcalEvent; rule: Rrule | null; exdates: Set<number>; rdates: number[]; durationMs: number | null }[] = []

  for (const raw of raws) {
    const uidProp = get(raw, "UID")
    const startProp = get(raw, "DTSTART")
    if (!uidProp?.value.trim() || !startProp) {
      warnings.push("événement ignoré : UID ou DTSTART manquant")
      continue
    }
    try {
      const uid = uidProp.value.trim().slice(0, 300)
      const start = parseIcalDate(startProp, calTz)
      if (!start.tz && !start.allDay && !startProp.value.endsWith("Z") && !calTz) warnings.push(`heure flottante interprétée en UTC (${uid})`)
      const endProp = get(raw, "DTEND")
      let endMs: number | null = endProp ? parseIcalDate(endProp, calTz).ms : null
      const dur = get(raw, "DURATION")?.value
      if (endMs === null && dur) {
        const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(dur)
        if (m) endMs = start.ms + (((Number(m[1] ?? 0) * 7 + Number(m[2] ?? 0)) * 24 + Number(m[3] ?? 0)) * 3600 + Number(m[4] ?? 0) * 60 + Number(m[5] ?? 0)) * 1000
      }
      if (endMs !== null && endMs < start.ms) endMs = null
      const statusRaw = (get(raw, "STATUS")?.value ?? "CONFIRMED").trim().toUpperCase()
      const description = get(raw, "DESCRIPTION") ? unescapeText(get(raw, "DESCRIPTION")!.value).trim() : null
      const urlRaw = get(raw, "URL")?.value.trim() ?? null
      const url = urlRaw && HTTPS.test(urlRaw) ? urlRaw : firstHttps(description)
      const attach = all(raw, "ATTACH").map((a) => a.value.trim()).find((v) => HTTPS.test(v) && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(v))
      const image = attach ?? ([...raw.props].find((pp) => /^X-.*IMAGE/.test(pp.name) && HTTPS.test(pp.value.trim()))?.value.trim() ?? null)
      const geo = get(raw, "GEO")?.value.split(/[;,]/).map(Number)
      // DTSTAMP (date de génération du flux) est volontairement ignoré : il change
      // à chaque téléchargement et ferait croire à une modification.
      const lastMod = get(raw, "LAST-MODIFIED")
      let lastModified: string | null = null
      if (lastMod) {
        try {
          lastModified = new Date(parseIcalDate(lastMod, "UTC").ms).toISOString()
        } catch {
          lastModified = null
        }
      }
      const seq = Number(get(raw, "SEQUENCE")?.value)
      const ev: IcalEvent = {
        uid,
        recurrenceUid: null,
        summary: unescapeText(get(raw, "SUMMARY")?.value ?? "").trim().slice(0, 300) || "(sans titre)",
        description: description ? description.slice(0, 20000) : null,
        location: get(raw, "LOCATION") ? unescapeText(get(raw, "LOCATION")!.value).trim().slice(0, 500) || null : null,
        url,
        imageUrl: image && image.length <= 1000 ? image : null,
        status: statusRaw === "CANCELLED" ? "cancelled" : statusRaw === "TENTATIVE" ? "tentative" : "confirmed",
        sequence: Number.isInteger(seq) && seq >= 0 ? seq : null,
        lastModified,
        start: new Date(start.ms).toISOString(),
        end: endMs !== null ? new Date(endMs).toISOString() : null,
        allDay: start.allDay,
        timeZone: start.tz ?? calTz,
        rrule: get(raw, "RRULE")?.value.trim().slice(0, 500) ?? null,
        geo: geo && geo.length === 2 && geo.every(Number.isFinite) ? { lat: geo[0], lon: geo[1] } : null,
      }
      const recurrenceId = get(raw, "RECURRENCE-ID")
      if (recurrenceId) {
        const rid = parseIcalDate(recurrenceId, ev.timeZone).ms
        overrides.set(`${uid}#${new Date(rid).toISOString()}`, { ...ev, recurrenceUid: uid, uid: `${uid}#${new Date(rid).toISOString()}` })
        continue
      }
      const rule = ev.rrule ? parseRrule(ev.rrule) : null
      if (ev.rrule && !rule) warnings.push(`règle de récurrence non prise en charge, première occurrence seule (${uid})`)
      // RDATE : dates supplémentaires de la série (les périodes « début/fin »
      // ne gardent que leur début).
      const rdates: number[] = []
      for (const rd of all(raw, "RDATE")) for (const v of rd.value.split(",")) {
        try {
          rdates.push(parseIcalDate({ ...rd, value: v.split("/")[0] }, ev.timeZone).ms)
        } catch {
          warnings.push(`RDATE illisible ignorée (${uid})`)
        }
      }
      if (rule || rdates.length) {
        const exdates = new Set<number>()
        for (const ex of all(raw, "EXDATE")) for (const v of ex.value.split(",")) {
          try {
            exdates.add(parseIcalDate({ ...ex, value: v }, ev.timeZone).ms)
          } catch {
            /* ignorée */
          }
        }
        masters.push({ ev, rule, exdates, rdates, durationMs: endMs !== null ? endMs - start.ms : null })
      } else events.push(ev)
    } catch (e) {
      warnings.push(`événement ignoré : ${(e as Error).message}`)
    }
  }

  // Développement des séries : une ligne par occurrence, identifiant stable
  // « UID#début-ISO » ; une occurrence modifiée (RECURRENCE-ID) remplace la
  // valeur calculée ; une occurrence exclue (EXDATE) n'est pas créée.
  for (const { ev, rule, exdates, rdates, durationMs } of masters) {
    const startMs = new Date(ev.start).getTime()
    const exp = rule ? expandRruleDetailed(startMs, ev.timeZone, rule, now) : { occurrences: [startMs], truncated: null }
    if (exp.truncated === "cap") warnings.push(`série tronquée au garde-fou de ${MAX_OCCURRENCES} occurrences (${ev.uid}) : historique incomplet pour cette série`)
    if (exp.truncated === "horizon") warnings.push(`série sans fin développée jusqu'à ${RECURRENCE_HORIZON_DAYS} jours (${ev.uid})`)
    const occurrences = [...new Set([...exp.occurrences, ...rdates])].sort((a, b) => a - b)
    for (const ms of occurrences) {
      if (exdates.has(ms)) continue
      const iso = new Date(ms).toISOString()
      const key = `${ev.uid}#${iso}`
      const override = overrides.get(key)
      if (override) {
        events.push(override)
        overrides.delete(key)
        continue
      }
      events.push({ ...ev, uid: key, recurrenceUid: ev.uid, start: iso, end: durationMs !== null ? new Date(ms + durationMs).toISOString() : null })
    }
  }
  // Occurrences modifiées hors de la plage développée : conservées telles quelles.
  for (const o of overrides.values()) events.push(o)

  // Dédoublonnage par UID (dernière modification gagnante).
  const byUid = new Map<string, IcalEvent>()
  for (const e of events) {
    const prev = byUid.get(e.uid)
    if (!prev || (e.sequence ?? 0) > (prev.sequence ?? 0) || ((e.sequence ?? 0) === (prev.sequence ?? 0) && (e.lastModified ?? "") >= (prev.lastModified ?? ""))) byUid.set(e.uid, e)
  }
  if (byUid.size < events.length) warnings.push(`${events.length - byUid.size} doublon(s) d'UID fusionné(s)`)
  return { name: calName, timeZone: calTz, events: [...byUid.values()].sort((a, b) => a.start.localeCompare(b.start)), warnings }
}
