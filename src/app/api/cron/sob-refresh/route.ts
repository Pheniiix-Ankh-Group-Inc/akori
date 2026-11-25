import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { refreshSob } from "@/lib/sob/refresh"
import { cronMetaFromHeaders, trackCronRun } from "@/lib/ops/cron-runs"

export const dynamic = "force-dynamic"
export const maxDuration = 180

/**
 * POST /api/cron/sob-refresh[?version=<version publiée>]
 * Appelé par le pipeline après chaque exécution : invalide les caches State of
 * BIB, vérifie directement PostgreSQL/Storage et lance les analyses IA. Authentifié par le
 * secret des tâches planifiées ; aucune session utilisateur n'est requise.
 *   200 : version attendue confirmée dans PostgreSQL et Storage ;
 *   409 : version ou intégrité non confirmée ;
 *   503 : configuration serveur absente (jamais un faux succès).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  const raw = req.nextUrl.searchParams.get("version")
  if (raw && !/^[A-Za-z0-9._-]{1,64}$/.test(raw)) return NextResponse.json({ ok: false, code: "invalid_version" }, { status: 400 })
  const report = await trackCronRun("sob-refresh", cronMetaFromHeaders(req.headers, "pipeline"), () => refreshSob(raw), (r) => ({
    status: r.ok ? "success" : "failed",
    details: { statusCode: r.statusCode, version: r.verification.version },
    error: r.ok ? null : r.verification.reason ?? `http_${r.statusCode}`,
  }))
  return NextResponse.json(report, { status: report.statusCode, headers: { "cache-control": "no-store" } })
}
