import "server-only"
import { z } from "zod"
import { aiConfig, env, isSupabaseAdminConfigured } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"

/**
 * Moteur IA commun (newsletter + insights State of BIB).
 *
 * - Fournisseur configurable (src/lib/ai/providers.ts) : anthropic, openai,
 *   mistral, openai-compatible ou mock (simulation sans clé, hors production).
 *   Ajouter AI_API_KEY (et AI_MODEL hors Anthropic) + FEATURE_AI=true suffit.
 * - « Fail closed » : sans FEATURE_AI=true et configuration complète, aucun
 *   appel n'est fait (AiDisabledError).
 * - Budget par exécution (AI_MAX_CALLS_PER_RUN), plafond de jetons de sortie,
 *   délai maximal ; chaque appel est tracé dans ai_runs (sans le contenu).
 * - Sortie STRUCTURÉE : JSON validé par un schéma zod. Le modèle rédige ;
 *   il ne fournit jamais de chiffres : ceux-ci sont calculés et insérés par
 *   le code, puis contrôlés hors LLM.
 */

export class AiDisabledError extends Error {}
export class AiBudgetError extends Error {}
export class AiOutputError extends Error {}

export type AiPurpose = "newsletter_draft" | "newsletter_regen" | "sob_insight" | "healthcheck"

export interface AiBudget {
  remainingCalls: number
  /** Jetons (entrée + sortie) restants pour l'exécution ; dépassement = arrêt. */
  remainingTokens?: number
}

export const newBudget = (): AiBudget => ({ remainingCalls: env.ai.maxCallsPerRun, remainingTokens: env.ai.maxTokensPerRun })

/** Erreur temporaire du fournisseur (429, 5xx) : un seul nouvel essai borné. */
export class AiTransientError extends Error {
  constructor(message: string, public readonly retryAfterMs: number | null) {
    super(message)
  }
}

function providerError(res: Response): Error {
  if (res.status === 429 || res.status >= 500) {
    const ra = Number(res.headers.get("retry-after"))
    return new AiTransientError(`fournisseur IA → HTTP ${res.status}`, Number.isFinite(ra) && ra > 0 ? ra * 1000 : null)
  }
  return new Error(`fournisseur IA → HTTP ${res.status}`)
}

interface RawResult {
  text: string
  truncated?: boolean
  inputTokens?: number
  outputTokens?: number
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), env.ai.timeoutMs)
  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

type Resolved = ReturnType<typeof aiConfig>

async function callAnthropic(cfg: Resolved, system: string, user: string, signal: AbortSignal): Promise<RawResult> {
  const res = await fetch(`${cfg.baseUrl}/v1/messages`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ai.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: env.ai.maxOutputTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  })
  if (!res.ok) throw providerError(res)
  const body = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string; usage?: { input_tokens?: number; output_tokens?: number } }
  const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("")
  return { text, truncated: body.stop_reason === "max_tokens", inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens }
}

/** OpenAI, Mistral et tout fournisseur compatible « chat completions ». */
async function callOpenAiProtocol(cfg: Resolved, system: string, user: string, signal: AbortSignal): Promise<RawResult> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${env.ai.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      [cfg.maxTokensParam]: env.ai.maxOutputTokens,
      ...(cfg.jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  if (!res.ok) throw providerError(res)
  const body = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
  return {
    text: body.choices?.[0]?.message?.content ?? "",
    truncated: body.choices?.[0]?.finish_reason === "length",
    inputTokens: body.usage?.prompt_tokens,
    outputTokens: body.usage?.completion_tokens,
  }
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) throw new AiOutputError("Réponse IA sans objet JSON.")
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new AiOutputError("Réponse IA : JSON invalide.")
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Appel structuré : un seul essai par appel (le budget borne les
 * régénérations). Renvoie l'objet validé et l'identifiant ai_runs.
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  purpose: AiPurpose
  system: string
  user: string
  schema: S
  budget: AiBudget
  /** Réponse simulée (fournisseur « mock » uniquement, jamais en production). */
  mock?: () => unknown
}): Promise<{ value: z.infer<S>; runId: string | null }> {
  const cfg = aiConfig()
  if (!cfg.ready) throw new AiDisabledError(`Moteur IA désactivé ou non configuré (${cfg.problems.join(", ")}).`)
  if (cfg.protocol === "mock" && !opts.mock) throw new AiDisabledError("Fournisseur simulé non disponible pour cet usage.")
  if (opts.budget.remainingCalls <= 0) throw new AiBudgetError("Budget d'appels IA épuisé pour cette exécution.")
  opts.budget.remainingCalls -= 1

  // Le test de connexion (healthcheck) n'est pas journalisé dans ai_runs.
  const admin = isSupabaseAdminConfigured() && opts.purpose !== "healthcheck" ? getAdminClient() : null
  let runId: string | null = null
  if (admin) {
    const { data } = await admin
      .from("ai_runs")
      .insert({ purpose: opts.purpose, provider: cfg.provider, model: cfg.model, status: "running" })
      .select("id")
      .single()
    runId = (data as { id: string } | null)?.id ?? null
  }

  const finish = async (status: "succeeded" | "failed", raw?: RawResult, error?: string) => {
    if (!admin || !runId) return
    await admin
      .from("ai_runs")
      .update({ status, finished_at: new Date().toISOString(), input_tokens: raw?.inputTokens ?? null, output_tokens: raw?.outputTokens ?? null, error: error?.slice(0, 500) ?? null })
      .eq("id", runId)
  }

  let raw: RawResult | undefined
  try {
    const call = (): Promise<RawResult> =>
      cfg.protocol === "mock"
        ? Promise.resolve({ text: JSON.stringify(opts.mock!()), inputTokens: 0, outputTokens: 0 })
        : withTimeout((signal) =>
            cfg.protocol === "anthropic" ? callAnthropic(cfg, opts.system, opts.user, signal) : callOpenAiProtocol(cfg, opts.system, opts.user, signal),
          )
    let result: RawResult
    try {
      result = await call()
    } catch (e) {
      // Un seul nouvel essai, uniquement pour une erreur temporaire, avec une
      // attente bornée (jamais de boucle d'appels non contrôlée).
      if (!(e instanceof AiTransientError)) throw e
      await sleep(Math.min(e.retryAfterMs ?? 2_000, 10_000))
      result = await call()
    }
    raw = result
    if (opts.budget.remainingTokens !== undefined) {
      opts.budget.remainingTokens -= (result.inputTokens ?? 0) + (result.outputTokens ?? 0)
    }
    if (result.truncated) throw new AiOutputError("Réponse IA tronquée (limite de jetons atteinte).")
    if (opts.budget.remainingTokens !== undefined && opts.budget.remainingTokens < 0) {
      throw new AiBudgetError("Budget de jetons IA dépassé pour cette exécution.")
    }
    const parsed = opts.schema.safeParse(extractJson(result.text))
    if (!parsed.success) throw new AiOutputError(`Sortie IA non conforme : ${parsed.error.issues[0]?.message ?? "schéma"}`)
    await finish("succeeded", raw)
    return { value: parsed.data, runId }
  } catch (e) {
    await finish("failed", raw, (e as Error).message)
    throw e
  }
}
