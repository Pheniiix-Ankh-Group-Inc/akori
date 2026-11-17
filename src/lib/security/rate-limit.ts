import "server-only"
import { createHash } from "node:crypto"
import { getAdminClient } from "@/lib/supabase/admin"
import { env, isSupabaseAdminConfigured } from "@/lib/env"

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

export type RateDecision = "allowed" | "limited" | "unavailable"

/** Compteur local, réservé au développement (jamais en production). */
const memory = new Map<string, { windowStart: number; hits: number }>()
const MEMORY_MAX_KEYS = 5_000

function memoryConsume(key: string, limit: number, windowSeconds: number, now: number): RateDecision {
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
  if (memory.size >= MEMORY_MAX_KEYS) {
    // Purge des fenêtres expirées, puis des plus anciennes si nécessaire.
    for (const [k, v] of memory) if (v.windowStart < windowStart) memory.delete(k)
    while (memory.size >= MEMORY_MAX_KEYS) memory.delete(memory.keys().next().value as string)
  }
  const entry = memory.get(key)
  if (!entry || entry.windowStart !== windowStart) {
    memory.set(key, { windowStart, hits: 1 })
    return "allowed"
  }
  entry.hits += 1
  return entry.hits <= limit ? "allowed" : "limited"
}

/**
 * Limitation de débit PARTAGÉE (PostgreSQL via la clé serveur), seule valable
 * sur une infrastructure multi-instance.
 * Politique de défaillance (fail closed) : si le limiteur partagé est absent
 * ou en panne en production, la décision est « unavailable » et l'appelant
 * répond 503 — jamais une autorisation par défaut. Le compteur mémoire n'est
 * utilisé qu'en développement local.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  opts: { production?: boolean; now?: number } = {},
): Promise<RateDecision> {
  const production = opts.production ?? process.env.NODE_ENV === "production"
  if (isSupabaseAdminConfigured()) {
    try {
      const { data, error } = await getAdminClient().rpc("consume_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      })
      if (!error && typeof data === "boolean") return data ? "allowed" : "limited"
    } catch {
      // traité ci-dessous
    }
    if (production) return "unavailable"
  } else if (production) {
    return "unavailable"
  }
  return memoryConsume(key, limit, windowSeconds, opts.now ?? Date.now())
}

/** Adresse IPv4/IPv6 plausible (évite d'utiliser une valeur arbitraire comme clé). */
export function isPlausibleIp(value: string): boolean {
  if (value.length > 45) return false
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-fA-F:]{2,45}$/.test(value)
}

/**
 * Adresse IP du client. Sur Vercel, x-real-ip et le premier élément de
 * x-forwarded-for sont posés par la plateforme (valeurs client écrasées).
 * Hors d'un tel proxy, ces en-têtes sont falsifiables : la clé IP n'est qu'un
 * des deux critères (le second porte sur l'adresse e-mail).
 */
export function clientIp(headers: Headers): string {
  const candidates = [headers.get("x-real-ip"), headers.get("x-forwarded-for")?.split(",")[0]]
  for (const c of candidates) {
    const v = c?.trim()
    if (v && isPlausibleIp(v)) return v
  }
  return "unknown"
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
