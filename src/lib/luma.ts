/**
 * Luma — destination externe des inscriptions uniquement.
 * BIB n'utilise ni l'API, ni les webhooks, ni l'import Luma : aucune donnée
 * de participants, billets ou paiements n'est récupérée ni stockée.
 * Ce module ne fait que valider et normaliser les URL saisies par les éditeurs.
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
