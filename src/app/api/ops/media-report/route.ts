import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { mediaStorageReport } from "@/lib/media/reconcile"

export const dynamic = "force-dynamic"

/**
 * GET /api/ops/media-report — réconciliation media_assets ↔ Storage.
 * Lecture seule, protégé par CRON_SECRET (Authorization: Bearer …).
 * Ne renvoie que des identifiants et chemins d'objets, aucun contenu.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  const report = await mediaStorageReport()
  if (!report.ok) return NextResponse.json({ ok: false, code: "unavailable" }, { status: 503 })
  const counts: Record<string, number> = {}
  for (const r of report.rows) counts[r.issue] = (counts[r.issue] ?? 0) + 1
  return NextResponse.json({ ok: true, counts, rows: report.rows.slice(0, 500) }, { headers: { "cache-control": "no-store" } })
}
