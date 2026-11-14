export const CONTENT_LOCALES = ["fr", "en", "es"] as const
export type ContentLocale = (typeof CONTENT_LOCALES)[number]

export const isContentLocale = (v: unknown): v is ContentLocale =>
  typeof v === "string" && (CONTENT_LOCALES as readonly string[]).includes(v)

/**
 * Choisit la traduction d'un contenu pour la langue demandée.
 * Repli explicite (en → fr → es) quand la traduction n'existe pas : aucun
 * texte n'est généré automatiquement. `fallback` indique la langue réellement
 * affichée pour que l'interface puisse le signaler.
 */
export function pickTranslation<T extends { locale: string }>(
  translations: T[] | null | undefined,
  locale: string,
): { value: T; shownLocale: string; isFallback: boolean } | null {
  if (!translations || translations.length === 0) return null
  const order = [locale, "en", "fr", "es"]
  for (const l of order) {
    const found = translations.find((t) => t.locale === l)
    if (found) return { value: found, shownLocale: l, isFallback: l !== locale }
  }
  return { value: translations[0], shownLocale: translations[0].locale, isFallback: true }
}

/** Valeur localisée d'un objet { fr, en, es } (textes alternatifs, légendes). */
export function pickLocalized(map: Record<string, string> | null | undefined, locale: string): string {
  if (!map) return ""
  return map[locale] || map.en || map.fr || map.es || ""
}

const INTL_LOCALE: Record<string, string> = { fr: "fr-CA", en: "en-CA", es: "es" }
export const intlLocale = (locale: string) => INTL_LOCALE[locale] ?? "en-CA"
