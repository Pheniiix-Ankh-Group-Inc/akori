import "server-only"

/**
 * Configuration serveur centralisée.
 * Tout ce qui peut envoyer un e-mail, engager un coût (IA), écrire dans un
 * service distant ou déclencher un traitement planifié est DÉSACTIVÉ par
 * défaut : chaque fonction ne s'active que si son drapeau vaut exactement
 * "true" ET si sa configuration est complète (« fail closed »).
 */

const flag = (name: string): boolean => process.env[name]?.trim() === "true"
const str = (name: string): string | undefined => {
  const v = process.env[name]?.trim()
  return v ? v : undefined
}
const int = (name: string, fallback: number): number => {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback
}

export const env = {
  siteUrl: (str("NEXT_PUBLIC_SITE_URL") ?? str("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/+$/, ""),

  supabase: {
    url: str("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: str("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    secretKey: str("SUPABASE_SECRET_KEY"),
  },

  brevo: {
    apiKey: str("BREVO_API_KEY"),
    apiUrl: str("BREVO_API_URL") ?? "https://api.brevo.com/v3",
    listIdFr: int("BREVO_LIST_ID_FR", 0),
    listIdEn: int("BREVO_LIST_ID_EN", 0),
    doiTemplateIdFr: int("BREVO_DOI_TEMPLATE_ID_FR", 0),
    doiTemplateIdEn: int("BREVO_DOI_TEMPLATE_ID_EN", 0),
    senderName: str("BREVO_SENDER_NAME") ?? "Black in Blockchain",
    senderEmail: str("BREVO_SENDER_EMAIL"),
  },

  ai: {
    provider: str("AI_PROVIDER"), // "anthropic" | "openai-compatible" | undefined
    model: str("AI_MODEL"),
    apiKey: str("AI_API_KEY"),
    baseUrl: str("AI_BASE_URL"),
    maxCallsPerRun: int("AI_MAX_CALLS_PER_RUN", 4),
    maxOutputTokens: int("AI_MAX_OUTPUT_TOKENS", 4000),
    timeoutMs: int("AI_TIMEOUT_MS", 60000),
  },

  newsletter: {
    maxRegenerations: int("NEWSLETTER_MAX_REGENERATIONS", 2),
    consentTextVersion: str("NEWSLETTER_CONSENT_VERSION") ?? "2026-11-v1",
    emailHashPepper: str("NEWSLETTER_EMAIL_HASH_PEPPER"),
  },

  alerts: {
    to: str("OPS_ALERT_EMAIL_TO"),
  },

  cron: {
    secret: str("CRON_SECRET"),
  },

  flags: {
    newsletterSubscribe: flag("FEATURE_NEWSLETTER_SUBSCRIBE"),
    newsletterAutosend: flag("FEATURE_NEWSLETTER_AUTOSEND"),
    newsIngest: flag("FEATURE_NEWS_INGEST"),
    ai: flag("FEATURE_AI"),
    opsAlerts: flag("FEATURE_OPS_ALERTS"),
    sobReadFromSupabase: flag("FEATURE_SOB_READ_FROM_SUPABASE"),
    // Contenus non sourcés masqués par défaut ; "true" pour les réafficher.
    homeShowUnverifiedSections: process.env.HOME_SHOW_UNVERIFIED_SECTIONS?.trim() === "true",
  },
} as const

export const isSupabaseConfigured = (): boolean =>
  Boolean(env.supabase.url && env.supabase.publishableKey)

export const isSupabaseAdminConfigured = (): boolean =>
  Boolean(env.supabase.url && env.supabase.secretKey)

export const isBrevoConfigured = (): boolean =>
  Boolean(env.brevo.apiKey && env.brevo.senderEmail && env.brevo.listIdFr && env.brevo.listIdEn)

export const isAiConfigured = (): boolean =>
  Boolean(env.flags.ai && env.ai.provider && env.ai.model && env.ai.apiKey)
