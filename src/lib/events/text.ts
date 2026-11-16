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
  if (exact) return { title: exact.title, summary: exact.summary ?? firstSentences(exact.description ?? event.source_description ?? null), description: exact.description ?? event.source_description ?? null, shownLocale: locale, isFallback: false }
  if (event.source_title) return { title: event.source_title, summary: firstSentences(event.source_description ?? null), description: event.source_description ?? null, shownLocale: "source", isFallback: false }
  const tr = pickTranslation(event.event_translations, locale)
  if (tr) return { title: tr.value.title, summary: tr.value.summary, description: tr.value.description, shownLocale: tr.shownLocale, isFallback: tr.isFallback }
  return { title: event.slug, summary: null, description: null, shownLocale: locale, isFallback: true }
}
