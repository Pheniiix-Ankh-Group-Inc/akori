import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { runCheck, runGenerate, runSend } from "@/lib/newsletter/orchestrator"
import { withRun } from "@/lib/ops/log"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * POST /api/cron/newsletter?step=generate|check|send
 * Déclenché par .github/workflows/newsletter.yml (désactivé par défaut).
 * L'envoi réel exige en plus FEATURE_NEWSLETTER_AUTOSEND=true.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })

  const step = req.nextUrl.searchParams.get("step")
  if (step !== "generate" && step !== "check" && step !== "send") return NextResponse.json({ ok: false, code: "unknown_step" }, { status: 400 })
  try {
    const result = await withRun(
      `cron.newsletter.${step}`,
      () => (step === "generate" ? runGenerate() : step === "check" ? runCheck() : runSend()),
      (r) => ({ weekStart: r.weekStart, cycleStatus: r.status, detail: r.detail ?? null }),
    )
    return NextResponse.json({ ok: true, result })
  } catch {
    return NextResponse.json({ ok: false, code: "error" }, { status: 500 })
  }
}
