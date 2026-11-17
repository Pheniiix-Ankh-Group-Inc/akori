import { createHash } from "node:crypto"
import type { IcalEvent } from "./ical"
import { normalizeLumaUrl } from "@/lib/luma"

/** Hôtes autorisés pour le flux iCal Luma (protection SSRF complémentaire). */
export const LUMA_FEED_HOSTS = new Set(["api.lu.ma", "api2.luma.com", "api.luma.com", "lu.ma", "luma.com", "www.luma.com"])

/** URL du flux : celle configurée, sinon une candidate construite (à vérifier). */
export function lumaFeedUrl(configured: string | undefined, calendarId: string): { url: string; candidate: boolean } {
  if (configured) return { url: configured, candidate: false }
  if (!/^cal-[A-Za-z0-9]{6,40}$/.test(calendarId)) throw new Error("identifiant de calendrier Luma invalide")
  return { url: `https://api.lu.ma/ics/get?entity=calendar&id=${encodeURIComponent(calendarId)}`, candidate: true }
}

export function assertLumaFeedUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error("URL du flux Luma invalide")
  }
  if (u.protocol !== "https:" || !LUMA_FEED_HOSTS.has(u.hostname.toLowerCase()) || u.username || u.password || u.port) {
    throw new Error("hôte du flux Luma non autorisé")
  }
  return u
}

export interface SyncEventPayload {
  uid: string
  recurrence_uid: string | null
  slug_base: string
  title: string
  description: string | null
  location: string | null
  url: string | null
  image_url: string | null
  status: "confirmed" | "tentative" | "cancelled"
  sequence: number | null
  rrule: string | null
  updated_at: string | null
  starts_at: string
  ends_at: string | null
  time_zone: string
  mode: "in_person" | "online" | "hybrid"
  hash: string
}

export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "evenement"
  )
}

const ONLINE = /(^https?:\/\/)|\b(online|en ligne|virtual|virtuel|zoom|google meet|meet\.google|teams\.microsoft|webinar|livestream)\b/i

/** Texte brut : balises HTML retirées, espaces normalisés. */
export function plainText(v: string | null): string | null {
  if (!v) return null
  const t = v
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return t || null
}

/**
 * Événement iCal → charge utile de synchronisation. L'empreinte SHA-256 porte
 * sur tous les champs gérés par Luma : une modification Luma change
 * l'empreinte, un flux identique ne produit aucune écriture.
 */
export function normalizeEvent(e: IcalEvent, fallbackTz: string): SyncEventPayload {
  const location = plainText(e.location)
  const url = normalizeLumaUrl(e.url)
  const mode: SyncEventPayload["mode"] = location ? (ONLINE.test(location) ? "online" : "in_person") : e.url && !url ? "online" : "in_person"
  const base = {
    uid: e.uid,
    recurrence_uid: e.recurrenceUid,
    slug_base: slugify(e.summary),
    title: e.summary.slice(0, 300),
    description: plainText(e.description)?.slice(0, 20000) ?? null,
    location: location?.slice(0, 500) ?? null,
    url,
    image_url: e.imageUrl && /^https:\/\/[^\s]+$/.test(e.imageUrl) ? e.imageUrl : null,
    status: e.status,
    sequence: e.sequence,
    rrule: e.rrule,
    updated_at: e.lastModified,
    starts_at: e.start,
    ends_at: e.end,
    time_zone: e.timeZone ?? fallbackTz,
    mode,
  }
  // Empreinte du contenu uniquement (pas de SEQUENCE ni LAST-MODIFIED, que
  // certains flux régénèrent sans changement réel).
  const { sequence: _s, updated_at: _u, ...content } = base
  void _s
  void _u
  const hash = createHash("sha256").update(JSON.stringify(content)).digest("hex")
  return { ...base, hash }
}
