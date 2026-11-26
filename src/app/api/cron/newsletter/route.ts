import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { runCheck, runGenerate, runSend } from "@/lib/newsletter/orchestrator"
import { cronMetaFromHeaders, trackCronRun } from "@/lib/ops/cron-runs"
import { classifyNewsletterStep } from "@/lib/ops/cron-outcome"

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
    const result = await trackCronRun(
      "newsletter",
      cronMetaFromHeaders(req.headers),
      () => (step === "generate" ? runGenerate() : step === "check" ? runCheck() : runSend()),
      // Édition bloquée ou semaine annulée : arrêt métier (incident déjà
      // enregistré), pas un échec technique. Envoi interrompu ou partiel :
      // échec. Pause, créneau non atteint, cycle déjà clos : no-op (skipped).
      (r) => classifyNewsletterStep(step, r),
    )
    return NextResponse.json({ ok: true, result })
  } catch {
    return NextResponse.json({ ok: false, code: "error" }, { status: 500 })
  }
}
