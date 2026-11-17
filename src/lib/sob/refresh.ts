import "server-only"
import { revalidatePath, revalidateTag } from "next/cache"
import { isAiConfigured } from "@/lib/env"
import { isSobAvailable, loadSobStateUncached, SOB_TAG } from "@/lib/sob/load"
import { runSobInsightsCycle, type InsightCycleReport } from "@/lib/sob/insights"
import { getAdminClient } from "@/lib/supabase/admin"
import { recordIncident } from "@/lib/ops/incidents"
import { routing } from "@/i18n/routing"

const SOURCE_ID = "electric-capital-osdd"
const PATHS = ["", "/state_of_bib", "/data-sources"]

export interface SobRefreshReport {
  ok: boolean
  /** Direct RPC verification, not a cached page read. */
  verification: { ok: boolean; version: string | null; versionId: string | null; reason?: string }
  /** Uncached SHA-256-verified private snapshot, not browser-visible state. */
  snapshot: { origin: string; version: string | null; snapshotDate: string | null; reason?: string }
  cache: { invalidationRequested: boolean; publicVersionVerified: false }
  expected: string | null
  insights: InsightCycleReport | { skipped: string }
  statusCode: 200 | 409 | 503
}

function invalidate() {
  // max = stale-while-revalidate, not immediate client-side visibility.
  revalidateTag(SOB_TAG, "max")
  // Default English URLs have no locale prefix (localePrefix='as-needed').
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale && routing.localePrefix === "as-needed" ? "" : `/${locale}`
    for (const page of PATHS) revalidatePath(`${prefix}${page}` || "/")
  }
}

/** Revalidation + direct PostgreSQL/Storage checks. HTTP 200 does not certify
 * visibility of this version via a cached public page or client router.
 */
export async function refreshSob(expected: string | null = null): Promise<SobRefreshReport> {
  let verification: SobRefreshReport["verification"]
  let databaseUnavailable = false
  try {
    const { data, error } = await getAdminClient().rpc("verify_current_dataset", { p_source_id: SOURCE_ID })
    if (error) {
      databaseUnavailable = true
      verification = { ok: false, version: null, versionId: null, reason: "database_verification_failed" }
    } else {
      const v = data as { ok?: boolean; version?: string | null; version_id?: string | null; problems?: string[] } | null
      verification = {
        ok: v?.ok === true && typeof v.version === "string",
        version: typeof v?.version === "string" ? v.version : null,
        versionId: typeof v?.version_id === "string" ? v.version_id : null,
        ...(v?.ok === true ? {} : { reason: Array.isArray(v?.problems) ? v.problems.slice(0, 3).join("; ") : "publication_not_verified" }),
      }
    }
  } catch {
    databaseUnavailable = true
    verification = { ok: false, version: null, versionId: null, reason: "database_unreachable" }
  }
  // Do not read loadSobState() here: "max" permits stale cache values.
  const state = verification.ok ? await loadSobStateUncached() : null
  const snapshot: SobRefreshReport["snapshot"] = state && isSobAvailable(state)
    ? { origin: state.origin, version: state.version, snapshotDate: state.headline.snapshot_date }
    : { origin: state?.origin ?? "unavailable", version: null, snapshotDate: null, reason: state?.reason ?? verification.reason }

  const ok = verification.ok && snapshot.origin === "supabase"
    && snapshot.version === verification.version && (!expected || expected === verification.version)
  const statusCode: SobRefreshReport["statusCode"] = ok ? 200 : databaseUnavailable ? 503 : 409
  // Only invalidate when the DB and private Storage confirm the publication.
  if (ok) invalidate()

  let insights: SobRefreshReport["insights"] = { skipped: "vérification des données incomplète" }
  if (ok && !isAiConfigured()) {
    insights = { skipped: "moteur IA non configuré : analyses différées" }
  } else if (ok) {
    try {
      insights = await runSobInsightsCycle()
      if (insights.published.length) invalidate()
    } catch {
      insights = { skipped: "cycle des analyses en échec ; statistiques conservées" }
      try {
        await recordIncident({ kind: "sob.insights_failed", severity: "warning", message: "Cycle IA State of BIB en échec (statistiques conservées)" })
      } catch { /* incident service unavailable */ }
    }
  }
  if (!ok) {
    try {
      await recordIncident({ kind: "sob.verification_failed", severity: "warning",
        message: "La version courante State of BIB n'a pas été confirmée hors cache",
        details: { expected, verification, snapshot, statusCode } })
    } catch { /* incident service unavailable */ }
  }
  return { ok, verification, snapshot,
    cache: { invalidationRequested: ok, publicVersionVerified: false },
    expected, insights, statusCode }
}
