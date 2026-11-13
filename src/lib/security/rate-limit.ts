import "server-only"
import { createHash } from "node:crypto"
import { getAdminClient } from "@/lib/supabase/admin"
import { env, isSupabaseAdminConfigured } from "@/lib/env"

const memory = new Map<string, { windowStart: number; hits: number }>()

/** Poivre serveur exigé : secret, long, distinct par environnement. */
export const isPepperConfigured = (): boolean => (env.newsletter.emailHashPepper?.length ?? 0) >= 32

/**
 * Empreinte non réversible (adresse IP, e-mail) avec poivre serveur.
 * Aucune valeur de repli : sans poivre conforme, l'appel échoue (fail closed).
 */
export function fingerprint(value: string): string {
  if (!isPepperConfigured()) throw new Error("NEWSLETTER_EMAIL_HASH_PEPPER manquant ou trop court (32 caractères minimum).")
  return createHash("sha256")
    .update(`${env.newsletter.emailHashPepper}:${value.trim().toLowerCase()}`)
    .digest("hex")
}

/**
 * Limitation de débit. Utilise Supabase (partagé entre instances) quand il
 * est configuré, sinon un compteur mémoire par instance (au mieux).
 * Renvoie true si la requête est autorisée.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (isSupabaseAdminConfigured()) {
    try {
      const { data, error } = await getAdminClient().rpc("consume_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      })
      if (!error && typeof data === "boolean") return data
    } catch {
      // repli mémoire ci-dessous
    }
  }
  const now = Date.now()
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
  const entry = memory.get(key)
  if (!entry || entry.windowStart !== windowStart) {
    memory.set(key, { windowStart, hits: 1 })
    return true
  }
  entry.hits += 1
  return entry.hits <= limit
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}

/** Protection CSRF simple pour les formulaires publics : même origine exigée. */
export function isSameOrigin(headers: Headers, requestUrl: string): boolean {
  const origin = headers.get("origin")
  if (!origin) return false
  try {
    const o = new URL(origin)
    const r = new URL(requestUrl)
    const site = new URL(env.siteUrl)
    return o.host === r.host || o.host === site.host || o.host === `www.${site.host}` || `www.${o.host}` === site.host
  } catch {
    return false
  }
}
