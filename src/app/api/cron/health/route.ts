import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { checkCronHealth } from "@/lib/ops/cron-runs"
import { withRun } from "@/lib/ops/log"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Contrôle de santé des tâches planifiées (échecs, exécutions manquantes,
 * blocages) et purge de l'historique. Déclenché une fois par jour par le
 * planificateur Vercel (vercel.json, GET + Authorization: Bearer CRON_SECRET),
 * indépendant de GitHub Actions dont il surveille les planifications ;
 * relançable à la main (POST, même secret).
 *   200 : toutes les tâches surveillées sont conformes ;
 *   207 : au moins un constat (incident enregistré, sans doublon) ;
 *   503 : historique indisponible (migration cron_runs non appliquée).
 */
async function handle(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  try {
    const report = await withRun("cron.health", () => checkCronHealth(), (r) => ({ ok: r.ok, source: r.source, alerted: r.alerted.length, purged: r.purged }))
    const status = report.source === "unavailable" ? 503 : report.ok ? 200 : 207
    return NextResponse.json(report, { status, headers: { "cache-control": "no-store" } })
  } catch {
    return NextResponse.json({ ok: false, code: "health_check_failed" }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
