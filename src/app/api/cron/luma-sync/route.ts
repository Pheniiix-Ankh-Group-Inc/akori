import { NextResponse, type NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { runLumaSync } from "@/lib/events/luma-sync"
import { EVENTS_TAG } from "@/lib/events/queries"
import { cronMetaFromHeaders, trackCronRun } from "@/lib/ops/cron-runs"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/** POST /api/cron/luma-sync — synchronisation périodique Luma → Supabase. */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  try {
    const meta = cronMetaFromHeaders(req.headers)
    const report = await trackCronRun("luma-sync", meta, () => runLumaSync({ trigger: "schedule" }), (r) => ({
      status: r.skipped ? "skipped" : r.ok ? "success" : "failed",
      items: r.feedEvents ?? null,
      details: { counts: r.counts ?? {}, warnings: r.warnings.length, lumaRunId: r.runId },
      error: r.ok ? null : r.error ?? "luma_sync_failed",
    }))
    if (report.skipped) return NextResponse.json({ ...report, ok: false, status: "skipped" }, { status: 409 })
    if (report.ok) revalidateTag(EVENTS_TAG, "max")
    return NextResponse.json({ ...report, status: report.ok ? "success" : "failed" }, { status: report.ok ? 200 : 502, headers: { "cache-control": "no-store" } })
  } catch {
    return NextResponse.json({ ok: false, status: "failed", code: "luma_sync_unavailable" }, { status: 503 })
  }
}
