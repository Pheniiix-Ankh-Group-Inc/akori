import "server-only"
import { z } from "zod"
import { env, isAiConfigured, isSupabaseAdminConfigured } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"

/**
 * Moteur IA commun (newsletter + insights State of BIB).
 *
 * - Fournisseur NON choisi : configurable par AI_PROVIDER ("anthropic" ou
 *   "openai-compatible"), AI_MODEL, AI_API_KEY, AI_BASE_URL.
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

export type AiPurpose = "newsletter_draft" | "newsletter_regen" | "sob_insight"

export interface AiBudget {
  remainingCalls: number
}

export const newBudget = (): AiBudget => ({ remainingCalls: env.ai.maxCallsPerRun })

interface RawResult {
  text: string
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

async function callAnthropic(system: string, user: string, signal: AbortSignal): Promise<RawResult> {
  const base = env.ai.baseUrl ?? "https://api.anthropic.com"
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ai.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ai.model,
      max_tokens: env.ai.maxOutputTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  })
  if (!res.ok) throw new Error(`fournisseur IA → HTTP ${res.status}`)
  const body = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }
  const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("")
  return { text, inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens }
}

async function callOpenAiCompatible(system: string, user: string, signal: AbortSignal): Promise<RawResult> {
  if (!env.ai.baseUrl) throw new AiDisabledError("AI_BASE_URL requis pour un fournisseur compatible OpenAI.")
  const res = await fetch(`${env.ai.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${env.ai.apiKey}` },
    body: JSON.stringify({
      model: env.ai.model,
      max_tokens: env.ai.maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`fournisseur IA → HTTP ${res.status}`)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
  return { text: body.choices?.[0]?.message?.content ?? "", inputTokens: body.usage?.prompt_tokens, outputTokens: body.usage?.completion_tokens }
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) throw new AiOutputError("Réponse IA sans objet JSON.")
  return JSON.parse(text.slice(start, end + 1))
}

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
}): Promise<{ value: z.infer<S>; runId: string | null }> {
  if (!isAiConfigured()) throw new AiDisabledError("Moteur IA désactivé ou non configuré.")
  if (opts.budget.remainingCalls <= 0) throw new AiBudgetError("Budget d'appels IA épuisé pour cette exécution.")
  opts.budget.remainingCalls -= 1

  const admin = isSupabaseAdminConfigured() ? getAdminClient() : null
  let runId: string | null = null
  if (admin) {
    const { data } = await admin
      .from("ai_runs")
      .insert({ purpose: opts.purpose, provider: env.ai.provider, model: env.ai.model, status: "running" })
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
    const result: RawResult = await withTimeout((signal) =>
      env.ai.provider === "anthropic"
        ? callAnthropic(opts.system, opts.user, signal)
        : env.ai.provider === "openai-compatible"
          ? callOpenAiCompatible(opts.system, opts.user, signal)
          : Promise.reject(new AiDisabledError(`Fournisseur IA inconnu : ${env.ai.provider}`)),
    )
    raw = result
    const parsed = opts.schema.safeParse(extractJson(result.text))
    if (!parsed.success) throw new AiOutputError(`Sortie IA non conforme : ${parsed.error.issues[0]?.message ?? "schéma"}`)
    await finish("succeeded", raw)
    return { value: parsed.data, runId }
  } catch (e) {
    await finish("failed", raw, (e as Error).message)
    throw e
  }
}
