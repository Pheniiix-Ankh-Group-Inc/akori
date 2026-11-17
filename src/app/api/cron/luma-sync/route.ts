import { NextResponse, type NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { runLumaSync } from "@/lib/events/luma-sync"
import { EVENTS_TAG } from "@/lib/events/queries"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/** POST /api/cron/luma-sync — synchronisation périodique Luma → Supabase. */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  try {
    const report = await runLumaSync({ trigger: "schedule" })
    if (report.skipped) return NextResponse.json({ ...report, ok: false, status: "skipped" }, { status: 409 })
    if (report.ok) revalidateTag(EVENTS_TAG, "max")
    return NextResponse.json({ ...report, status: report.ok ? "success" : "failed" }, { status: report.ok ? 200 : 502, headers: { "cache-control": "no-store" } })
  } catch {
    return NextResponse.json({ ok: false, status: "failed", code: "luma_sync_unavailable" }, { status: 503 })
  }
}
