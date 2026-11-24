import { pickTranslation } from "@/lib/content/locales"
import type { EventRecord } from "./types"

export interface EventText {
  title: string
  summary: string | null
  description: string | null
  /** "source" = texte original de Luma ; sinon langue du complément BIB affiché. */
  shownLocale: string
  isFallback: boolean
}

export interface LumaDescription {
  /** Texte rédigé par l'organisateur, sans le gabarit ajouté par Luma. */
  body: string | null
  /** Lignes d'adresse extraites du bloc « Address: ». */
  address: string[]
  /** Organisateurs extraits de la ligne « Hosted by … ». */
  hosts: string | null
  /** Lien « Get up-to-date information at: … » (page Luma de l'événement). */
  infoUrl: string | null
}

/**
 * Le flux iCal de Luma ajoute un gabarit en anglais à chaque description
 * (« Get up-to-date information at: … », « Address: … », « Hosted by … »).
 * Ces informations sont extraites pour être affichées dans toutes les
 * langues, avec des libellés traduits ; seul le texte libre de
 * l'organisateur reste dans sa langue d'origine (sauf traduction BIB).
 */
export function splitLumaDescription(text: string | null | undefined): LumaDescription {
  if (!text) return { body: null, address: [], hosts: null, infoUrl: null }
  const address: string[] = []
  let hosts: string | null = null
  let infoUrl: string | null = null
  const kept: string[] = []
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const info = /^get up-to-date information at:?\s*(\S+)?/i.exec(line)
    if (info) {
      if (info[1] && /^https:\/\//.test(info[1])) infoUrl = info[1]
      continue
    }
    if (/^address:?$/i.test(line)) {
      while (i + 1 < lines.length && lines[i + 1].trim()) address.push(lines[++i].trim())
      continue
    }
    const host = /^hosted by\s+(.+)$/i.exec(line)
    if (host) {
      hosts = host[1].trim()
      continue
    }
    kept.push(lines[i])
  }
  const body = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return { body: body || null, address, hosts, infoUrl }
}

const firstSentences = (text: string | null, max = 220): string | null => {
  if (!text) return null
  const flat = text.replace(/\s+/g, " ").trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).trim()}…`
}

/**
 * Textes affichés d'un événement : le complément éditorial BIB dans la langue
 * demandée est prioritaire ; sinon le texte original Luma ; sinon un
 * complément BIB d'une autre langue. Luma reste la source de vérité ; BIB
 * peut seulement traduire ou résumer, jamais modifier les données Luma.
 */
export function eventText(event: Pick<EventRecord, "event_translations" | "slug" | "source_title" | "source_description">, locale: string): EventText {
  const exact = event.event_translations?.find((t) => t.locale === locale)
  if (exact) return { title: exact.title, summary: exact.summary ?? firstSentences(exact.description ?? splitLumaDescription(event.source_description).body), description: exact.description ?? splitLumaDescription(event.source_description).body, shownLocale: locale, isFallback: false }
  if (event.source_title) {
    const body = splitLumaDescription(event.source_description).body
    return { title: event.source_title, summary: firstSentences(body), description: body, shownLocale: "source", isFallback: false }
  }
  const tr = pickTranslation(event.event_translations, locale)
  if (tr) return { title: tr.value.title, summary: tr.value.summary, description: tr.value.description, shownLocale: tr.shownLocale, isFallback: tr.isFallback }
  return { title: event.slug, summary: null, description: null, shownLocale: locale, isFallback: true }
}
