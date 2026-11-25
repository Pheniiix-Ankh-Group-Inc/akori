import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
import { ingestNews } from "@/lib/news/ingest"
import { recordIncident } from "@/lib/ops/incidents"
import { cronMetaFromHeaders, trackCronRun } from "@/lib/ops/cron-runs"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/** POST /api/cron/news — veille quotidienne des sources autorisées (sans IA). */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!env.flags.newsIngest) return NextResponse.json({ ok: true, skipped: "news_ingest_disabled" })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  try {
    const report = await trackCronRun("news", cronMetaFromHeaders(req.headers), () => ingestNews(), (r) => ({
      status: r.failures.length && !r.inserted && r.failures.length >= r.sources ? "failed" : "success",
      items: r.inserted,
      details: { sources: r.sources, fetched: r.fetched, inserted: r.inserted, failures: r.failures.length },
      error: r.failures.length ? `${r.failures.length} source(s) en échec` : null,
    }))
    if (report.failures.length) {
      await recordIncident({ kind: "news.fetch_failures", severity: "warning", message: `${report.failures.length} source(s) en échec`, details: { failures: report.failures } })
    }
    return NextResponse.json({ ok: true, report })
  } catch (e) {
    await recordIncident({ kind: "news.ingest_error", severity: "warning", message: (e as Error).message.slice(0, 300) })
    return NextResponse.json({ ok: false, code: "error" }, { status: 500 })
  }
}
