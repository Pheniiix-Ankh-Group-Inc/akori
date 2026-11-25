import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { refreshSob } from "@/lib/sob/refresh"
import { cronMetaFromHeaders, trackCronRun } from "@/lib/ops/cron-runs"

export const dynamic = "force-dynamic"
export const maxDuration = 180

/**
 * POST /api/cron/sob-insights — ancien point d'entrée, conservé pour
 * compatibilité : même traitement que /api/cron/sob-refresh (invalidation des
 * caches puis analyses IA de la version courante).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  const report = await trackCronRun("sob-refresh", cronMetaFromHeaders(req.headers, "pipeline"), () => refreshSob(null), (r) => ({
    status: r.ok ? "success" : "failed",
    details: { statusCode: r.statusCode, version: r.verification.version },
    error: r.ok ? null : r.verification.reason ?? `http_${r.statusCode}`,
  }))
  return NextResponse.json(report, { status: report.ok ? 200 : 409, headers: { "cache-control": "no-store" } })
}
