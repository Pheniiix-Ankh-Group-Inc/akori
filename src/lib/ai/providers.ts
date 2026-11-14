/**
 * Résolution de la configuration IA (module pur, testé unitairement).
 *
 * Objectif : ajouter UNE clé suffit à activer l'IA. Les fournisseurs connus
 * ont une URL d'API par défaut ; Anthropic a aussi un modèle par défaut.
 * Pour les autres, AI_MODEL reste obligatoire (aucun modèle n'est deviné).
 *
 *   AI_PROVIDER        anthropic | openai | mistral | openai-compatible | mock
 *   AI_API_KEY         clé du fournisseur (inutile pour mock)
 *   AI_MODEL           facultatif pour anthropic, obligatoire sinon
 *   AI_BASE_URL        facultatif (obligatoire pour openai-compatible)
 *   FEATURE_AI=true    interrupteur général (aucun appel sinon)
 *
 * « mock » : réponses simulées et déterministes construites à partir des
 * données réelles, pour tester tout le cycle sans clé ni coût. Interdit sur
 * le déploiement de production (VERCEL_ENV=production).
 */

export type AiProviderId = "anthropic" | "openai" | "mistral" | "openai-compatible" | "mock"
export type AiProtocol = "anthropic" | "openai" | "mock"

export interface AiProviderPreset {
  protocol: AiProtocol
  baseUrl: string | null
  defaultModel: string | null
  /** Nom du paramètre de plafond de jetons de sortie. */
  maxTokensParam: "max_tokens" | "max_completion_tokens"
  /** Le fournisseur accepte response_format: { type: "json_object" }. */
  jsonMode: boolean
}

export const AI_PRESETS: Record<AiProviderId, AiProviderPreset> = {
  anthropic: { protocol: "anthropic", baseUrl: "https://api.anthropic.com", defaultModel: "claude-sonnet-5-5", maxTokensParam: "max_tokens", jsonMode: false },
  openai: { protocol: "openai", baseUrl: "https://api.openai.com/v1", defaultModel: null, maxTokensParam: "max_completion_tokens", jsonMode: true },
  mistral: { protocol: "openai", baseUrl: "https://api.mistral.ai/v1", defaultModel: null, maxTokensParam: "max_tokens", jsonMode: true },
  "openai-compatible": { protocol: "openai", baseUrl: null, defaultModel: null, maxTokensParam: "max_tokens", jsonMode: true },
  mock: { protocol: "mock", baseUrl: null, defaultModel: "mock", maxTokensParam: "max_tokens", jsonMode: false },
}

export interface AiEnvInput {
  enabled: boolean
  provider?: string | null
  model?: string | null
  apiKey?: string | null
  baseUrl?: string | null
  /** Valeur de VERCEL_ENV (production | preview | development) si connue. */
  deployment?: string | null
}

export interface ResolvedAiConfig {
  enabled: boolean
  provider: AiProviderId | null
  protocol: AiProtocol | null
  model: string | null
  baseUrl: string | null
  maxTokensParam: AiProviderPreset["maxTokensParam"]
  jsonMode: boolean
  /** Prêt à appeler le fournisseur (interrupteur + configuration complète). */
  ready: boolean
  /** Éléments manquants ou refusés, sans aucune valeur secrète. */
  problems: string[]
}

const isProvider = (v: string): v is AiProviderId => v in AI_PRESETS

export function resolveAiConfig(input: AiEnvInput): ResolvedAiConfig {
  const problems: string[] = []
  const raw = (input.provider ?? "").trim().toLowerCase()
  const provider = raw ? (isProvider(raw) ? raw : null) : null
  if (!raw) problems.push("AI_PROVIDER manquant")
  else if (!provider) problems.push(`AI_PROVIDER inconnu (${raw})`)

  const preset = provider ? AI_PRESETS[provider] : null
  const model = (input.model ?? "").trim() || preset?.defaultModel || null
  let baseUrl = (input.baseUrl ?? "").trim().replace(/\/+$/, "") || preset?.baseUrl || null

  if (preset && preset.protocol !== "mock") {
    if (!input.apiKey?.trim()) problems.push("AI_API_KEY manquant")
    if (!model) problems.push("AI_MODEL manquant")
    if (!baseUrl) problems.push("AI_BASE_URL manquant")
    if (baseUrl) {
      try {
        const u = new URL(baseUrl)
        if (u.protocol !== "https:") problems.push("AI_BASE_URL doit être en https")
      } catch {
        problems.push("AI_BASE_URL invalide")
        baseUrl = null
      }
    }
  }
  if (provider === "mock" && input.deployment === "production") problems.push("Fournisseur simulé interdit en production")
  if (!input.enabled) problems.push("FEATURE_AI désactivé")

  return {
    enabled: input.enabled,
    provider,
    protocol: preset?.protocol ?? null,
    model,
    baseUrl,
    maxTokensParam: preset?.maxTokensParam ?? "max_tokens",
    jsonMode: preset?.jsonMode ?? false,
    ready: problems.length === 0,
    problems,
  }
}
