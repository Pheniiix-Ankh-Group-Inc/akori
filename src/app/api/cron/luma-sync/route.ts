import { NextResponse, type NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { isAuthorizedCron } from "@/lib/security/cron"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
import { runLumaSync } from "@/lib/events/luma-sync"
import { EVENTS_TAG } from "@/lib/events/queries"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/** POST /api/cron/luma-sync — synchronisation périodique Luma → Supabase. */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!env.flags.lumaSync) return NextResponse.json({ ok: true, skipped: "luma_sync_disabled" })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  const report = await runLumaSync({ trigger: "schedule" })
  if (report.ok && !report.skipped) revalidateTag(EVENTS_TAG, "max")
  return NextResponse.json(report, { status: report.ok ? 200 : 502 })
}
