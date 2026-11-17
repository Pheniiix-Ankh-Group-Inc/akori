/**
 * Luma — source de vérité des événements BIB.
 *  · Affichage : calendrier embarqué (getLumaEmbedUrl, intégration conservée
 *    telle qu'elle existe dans main et validée par le propriétaire).
 *  · Données : flux iCal synchronisé dans Supabase (src/lib/events/luma-sync).
 *  · Inscription : lien vers la page Luma de l'événement.
 * Aucune donnée de participants, billets ou paiements n'est récupérée ni
 * stockée ; ni l'API payante ni l'extraction de l'iframe ne sont utilisées.
 */

const LUMA_HOSTS = new Set(["lu.ma", "www.lu.ma", "luma.com", "www.luma.com"])

/** Renvoie l'URL normalisée si c'est une page Luma HTTPS valide, sinon null. */
export function normalizeLumaUrl(input: string | null | undefined): string | null {
  if (!input) return null
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" || !LUMA_HOSTS.has(url.hostname.toLowerCase())) return null
  if (url.username || url.password || url.port) return null
  const path = url.pathname.replace(/\/+$/, "")
  if (!/^\/[A-Za-z0-9._~/-]+$/.test(path)) return null
  // Les paramètres de requête et ancres ne sont pas conservés.
  return `https://${url.hostname.toLowerCase()}${path}`
}

export const isValidLumaUrl = (input: string | null | undefined) => normalizeLumaUrl(input) !== null

/**
 * URL du calendrier Luma embarqué (identique à main :
 * https://lu.ma/embed/calendar/<id>/events). L'identifiant est contrôlé ;
 * renvoie null plutôt que de construire une URL à partir d'une valeur inattendue.
 */
export function getLumaEmbedUrl(calendarId: string): string | null {
  if (!/^cal-[A-Za-z0-9]{6,40}$/.test(calendarId ?? "")) return null
  return `https://lu.ma/embed/calendar/${calendarId}/events`
}
