import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { aiConfig, env } from "@/lib/env"
import { generateStructured, newBudget } from "@/lib/ai/engine"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET  /api/ops/ai-status — diagnostic de configuration IA (aucun appel,
 *      aucune valeur secrète : fournisseur, modèle, problèmes éventuels).
 * POST /api/ops/ai-status — test de connexion MANUEL : un seul appel minimal
 *      (quelques jetons) pour vérifier la clé. Jamais planifié.
 * Protégé par CRON_SECRET (Authorization: Bearer …).
 */
function summary() {
  const cfg = aiConfig()
  return {
    enabled: cfg.enabled,
    provider: cfg.provider,
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    keyPresent: Boolean(env.ai.apiKey),
    ready: cfg.ready,
    problems: cfg.problems,
    limits: { callsPerRun: env.ai.maxCallsPerRun, tokensPerRun: env.ai.maxTokensPerRun, outputTokens: env.ai.maxOutputTokens, timeoutMs: env.ai.timeoutMs },
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, ai: summary() }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  const ai = summary()
  if (!ai.ready) return NextResponse.json({ ok: false, ai }, { status: 503 })
  try {
    const { value } = await generateStructured({
      purpose: "healthcheck",
      system: 'Reply with the JSON object {"status":"ok"} and nothing else.',
      user: "Connection test.",
      schema: z.object({ status: z.literal("ok") }),
      budget: { ...newBudget(), remainingCalls: 1 },
      mock: () => ({ status: "ok" }),
    })
    return NextResponse.json({ ok: value.status === "ok", ai })
  } catch (e) {
    return NextResponse.json({ ok: false, ai, error: (e as Error).message.slice(0, 300) }, { status: 502 })
  }
}
