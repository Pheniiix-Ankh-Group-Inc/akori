import { track } from "@vercel/analytics"

/**
 * Événements métier envoyés à Vercel Web Analytics (côté navigateur).
 *
 * Règles :
 * - liste fermée d'événements (ANALYTICS_EVENTS) ; tout autre nom est ignoré ;
 * - au plus 2 propriétés par événement (limite du forfait Pro), valeurs
 *   courtes, jamais d'adresse e-mail, de jeton, d'identifiant personnel ni
 *   d'URL complète (seulement un nom d'hôte ou un identifiant de contenu) ;
 * - un événement de consultation n'est émis qu'une fois par page affichée
 *   (clé de dédoublonnage) ; un clic sortant identique n'est compté qu'une
 *   fois par seconde ;
 * - un clic n'est jamais une conversion : newsletter_signup_success n'est émis
 *   qu'au retour du lien de confirmation (double opt-in), pas à l'envoi du
 *   formulaire.
 *
 * Forfait Hobby : Vercel n'enregistre pas les événements personnalisés (pages
 * vues uniquement). Le code reste en place et devient effectif sur Pro.
 * Voir docs/MONITORING.md.
 */
export const ANALYTICS_EVENTS = [
  "newsletter_signup_success",
  "newsletter_signup_failure",
  "article_view",
  "article_read_complete",
  "state_of_bib_view",
  "outbound_click",
  "dashboard_view",
  "login_success",
  "login_failure",
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]
export type AnalyticsProps = Record<string, string | number | boolean | null>

const EVENT_SET: ReadonlySet<string> = new Set(ANALYTICS_EVENTS)
const MAX_PROPS = 2
const SENSITIVE_KEY = /(mail|token|password|secret|key|auth|session|cookie|phone|name|ip|user|id$)/i
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const LONG_TOKEN = /[A-Za-z0-9_]{24,}/

export function isAnalyticsEvent(name: string): name is AnalyticsEvent {
  return EVENT_SET.has(name)
}

/**
 * Propriétés sûres : au plus 2, clés neutres, valeurs scalaires courtes, sans
 * e-mail ni jeton. Une valeur suspecte est supprimée, pas tronquée.
 */
export function sanitizeProps(props: Record<string, unknown> = {}): AnalyticsProps {
  const out: AnalyticsProps = {}
  for (const [key, value] of Object.entries(props)) {
    if (Object.keys(out).length >= MAX_PROPS) break
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(key) || SENSITIVE_KEY.test(key)) continue
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value
    else if (typeof value === "boolean" || value === null) out[key] = value
    else if (typeof value === "string") {
      const v = value.trim().slice(0, 80)
      if (v && !EMAIL.test(v) && !LONG_TOKEN.test(v) && !/[?&=]/.test(v)) out[key] = v
    }
  }
  return out
}

/** Paramètres d'URL conservés dans les pages vues (aucun ne porte de donnée personnelle). */
const KEPT_QUERY: Record<string, ReadonlySet<string>> = { newsletter: new Set(["confirmed"]) }

/**
 * URL envoyée à l'analytics : origine + chemin, sans fragment et sans
 * paramètres (jetons de connexion, codes, adresses…), sauf liste blanche.
 */
export function scrubUrl(raw: string): string {
  try {
    const url = new URL(raw)
    const kept = new URLSearchParams()
    for (const [k, v] of url.searchParams) if (KEPT_QUERY[k]?.has(v)) kept.set(k, v)
    const q = kept.toString()
    return `${url.origin}${url.pathname}${q ? `?${q}` : ""}`
  } catch {
    return raw.split(/[?#]/)[0]
  }
}

/** Dédoublonnage en mémoire pour la page courante. */
const seen = new Set<string>()
const lastClick = new Map<string, number>()

/** Pour les tests uniquement. */
export function resetAnalyticsDedupe() {
  seen.clear()
  lastClick.clear()
}

type Sender = (name: string, props: AnalyticsProps) => void
let sender: Sender = (name, props) => track(name, props)

/** Pour les tests uniquement. */
export function setAnalyticsSender(fn: Sender) {
  sender = fn
}

/**
 * Émet un événement métier. Renvoie true s'il a été envoyé.
 * once : clé de dédoublonnage (ex. "article_view:/fr/en-action/x").
 * throttleMs : délai minimal entre deux envois de même clé.
 */
export function trackEvent(name: AnalyticsEvent, props: Record<string, unknown> = {}, opts: { once?: string; throttleMs?: number; key?: string } = {}): boolean {
  if (!isAnalyticsEvent(name)) return false
  if (opts.once) {
    if (seen.has(opts.once)) return false
    seen.add(opts.once)
  }
  if (opts.throttleMs && opts.key) {
    const now = Date.now()
    const prev = lastClick.get(opts.key)
    if (prev !== undefined && now - prev < opts.throttleMs) return false
    lastClick.set(opts.key, now)
  }
  try {
    sender(name, sanitizeProps(props))
    return true
  } catch {
    return false
  }
}

/** Nom d'hôte d'un lien sortant, ou null si le lien reste sur le site. */
export function outboundHost(href: string, currentOrigin: string): string | null {
  try {
    const url = new URL(href, currentOrigin)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (url.origin === currentOrigin) return null
    return url.hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}
