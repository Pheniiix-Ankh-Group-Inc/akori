/**
 * Journalisation structurée (JSON, une ligne par événement) avec identifiant
 * de corrélation et masquage systématique des données sensibles.
 * Ne jamais y placer : clés API, jetons, adresses e-mail, preuves de
 * consentement, secrets de planification. Module pur, testé unitairement.
 */

const SECRET_KEY = /(secret|token|password|passwd|api[-_]?key|authorization|cookie|pepper|signature)/i
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi
const KEY_LIKE = /\b(sb_secret_|sb_publishable_|xkeysib-|sk-ant-|sk-)[A-Za-z0-9_-]{6,}/g

export function redactString(value: string): string {
  return value.replace(EMAIL, "[email]").replace(BEARER, "$1[redacted]").replace(KEY_LIKE, "$1[redacted]")
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[…]"
  if (typeof value === "string") return redactString(value).slice(0, 2000)
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? "[redacted]" : redact(v, depth + 1)
    }
    return out
  }
  return value
}

export function newCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

type Level = "info" | "warn" | "error"

export function logEvent(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(redact(fields) as Record<string, unknown>) })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

/** Mesure une tâche : début, fin, durée, statut, sans contenu sensible. */
export async function withRun<T>(event: string, fn: (correlationId: string) => Promise<T>, summarize?: (r: T) => Record<string, unknown>): Promise<T> {
  const correlationId = newCorrelationId()
  const started = Date.now()
  logEvent("info", `${event}.start`, { correlationId })
  try {
    const result = await fn(correlationId)
    logEvent("info", `${event}.end`, { correlationId, durationMs: Date.now() - started, status: "ok", ...(summarize ? summarize(result) : {}) })
    return result
  } catch (e) {
    logEvent("error", `${event}.end`, { correlationId, durationMs: Date.now() - started, status: "error", error: (e as Error).message })
    throw e
  }
}
