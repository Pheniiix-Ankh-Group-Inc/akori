import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { refreshSob } from "@/lib/sob/refresh"

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
  const report = await refreshSob(null)
  return NextResponse.json(report, { status: report.ok ? 200 : 409, headers: { "cache-control": "no-store" } })
}
