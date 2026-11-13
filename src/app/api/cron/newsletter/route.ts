import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { runCheck, runGenerate, runSend } from "@/lib/newsletter/orchestrator"

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
  try {
    const result =
      step === "generate" ? await runGenerate() : step === "check" ? await runCheck() : step === "send" ? await runSend() : null
    if (!result) return NextResponse.json({ ok: false, code: "unknown_step" }, { status: 400 })
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    console.error("[cron/newsletter] échec", (e as Error).message)
    return NextResponse.json({ ok: false, code: "error" }, { status: 500 })
  }
}
