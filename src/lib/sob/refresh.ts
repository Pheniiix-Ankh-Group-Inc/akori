import "server-only"
import { revalidatePath, revalidateTag } from "next/cache"
import { isAiConfigured } from "@/lib/env"
import { isSobAvailable, loadSobState, SOB_TAG } from "@/lib/sob/load"
import { runSobInsightsCycle, type InsightCycleReport } from "@/lib/sob/insights"
import { recordIncident } from "@/lib/ops/incidents"
import { routing } from "@/i18n/routing"

export interface SobRefreshReport {
  ok: boolean
  /** Version réellement servie par le site après invalidation des caches. */
  served: { origin: string; version: string | null; snapshotDate: string | null; reason?: string }
  expected: string | null
  insights: InsightCycleReport | { skipped: string }
}

/** Pages publiques qui affichent des données State of BIB. */
const PATHS = ["", "/state_of_bib", "/data-sources"]

function invalidate() {
  // Données (cache applicatif) puis pages rendues : la prochaine visite voit
  // la nouvelle version, sans redéploiement ni purge manuelle.
  revalidateTag(SOB_TAG, "max")
  for (const locale of routing.locales) for (const p of PATHS) revalidatePath(`/${locale}${p}`)
}

/**
 * Actualisation automatique du site après une publication State of BIB :
 * invalide les caches, relit la version courante (artefacts vérifiés), puis
 * lance le cycle des analyses IA. `expected` (version publiée par le pipeline)
 * permet de VÉRIFIER que le site sert bien la nouvelle version.
 * Un échec des analyses n'empêche jamais l'actualisation des statistiques.
 */
export async function refreshSob(expected: string | null = null): Promise<SobRefreshReport> {
  invalidate()
  const state = await loadSobState()
  const served = isSobAvailable(state)
    ? { origin: state.origin, version: state.version, snapshotDate: state.headline.snapshot_date }
    : { origin: state.origin, version: null, snapshotDate: null, reason: state.reason }
  const servedOk = isSobAvailable(state) && state.origin === "supabase" && (!expected || state.version === expected)

  let insights: SobRefreshReport["insights"]
  if (!isAiConfigured()) {
    insights = { skipped: "moteur IA non configuré : analyses différées" }
  } else {
    try {
      insights = await runSobInsightsCycle()
      if (insights.published.length) invalidate()
    } catch (e) {
      insights = { skipped: `cycle des analyses en échec : ${(e as Error).message.slice(0, 160)}` }
      try {
        await recordIncident({ kind: "sob.insights_failed", severity: "warning", message: "Cycle des analyses State of BIB en échec (les statistiques restent publiées)", details: { error: (e as Error).message.slice(0, 300) } })
      } catch {
        /* journalisation indisponible */
      }
    }
  }
  if (!servedOk) {
    try {
      await recordIncident({ kind: "sob.site_not_updated", severity: "warning", message: `Le site ne sert pas la version attendue (${expected ?? "version courante"})`, details: { served, expected } })
    } catch {
      /* journalisation indisponible */
    }
  }
  return { ok: servedOk, served, expected, insights }
}
