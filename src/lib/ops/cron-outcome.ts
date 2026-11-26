import type { CronOutcome } from "@/lib/ops/cron-runs"

/**
 * Classification des exécutions planifiées pour cron_runs.
 *
 * `status` décrit la tâche technique (le contrôle de santé compte les
 * `failed`) ; `details.outcome` décrit le résultat métier :
 *  · progressed        — la tâche a fait avancer l'état (brouillon, envoi…)
 *  · noop              — rien à faire : pause, créneau non atteint, verrou
 *                        tenu par une autre exécution, cycle déjà clos
 *  · business_stop     — arrêt métier voulu par les garde-fous (édition
 *                        bloquée par un contrôle, semaine annulée) ; incident
 *                        déjà enregistré par l'orchestrateur
 *  · delivery_failure  — envoi interrompu ou partiel : intervention requise
 *  · partial / all_failed / no_sources — veille d'actualités
 *
 * Seuls delivery_failure, all_failed et no_sources sont des échecs de la tâche.
 */
export type CronBusinessOutcome = "progressed" | "noop" | "business_stop" | "delivery_failure" | "partial" | "all_failed" | "no_sources"

const NOOP_DETAILS = new Set([
  "module en pause",
  "module en pause : aucun envoi",
  "créneau non atteint",
  "verrou non obtenu",
  "verrou détenu par une autre exécution",
  "cycle édité par l'équipe",
  "déjà traité",
  "rien à contrôler",
])

export function classifyNewsletterStep(step: string, r: { weekStart: string; status: string; detail?: string }): CronOutcome {
  const details = { step, weekStart: r.weekStart, cycleStatus: r.status, detail: r.detail ?? null }
  const already = r.detail === "déjà traité" || r.detail === "rien à contrôler"
  if (r.status === "failed" || r.status === "partially_sent") {
    // Déjà constaté par une exécution précédente : l'incident existe, la
    // nouvelle exécution n'a rien fait. Sinon : échec de livraison.
    if (already) return { status: "skipped", details: { ...details, outcome: "noop" } }
    return { status: "failed", error: `newsletter ${step}: ${r.status}`, details: { ...details, outcome: "delivery_failure" } }
  }
  if (r.detail && NOOP_DETAILS.has(r.detail)) return { status: "skipped", details: { ...details, outcome: "noop" } }
  if (r.status === "blocked" || r.status === "cancelled") return { status: "success", details: { ...details, outcome: "business_stop" } }
  return { status: "success", details: { ...details, outcome: "progressed" } }
}

export function classifyNewsIngest(r: { sources: number; fetched: number; inserted: number; failures: unknown[] }): CronOutcome {
  const failed = r.failures.length
  const details = { sources: r.sources, fetched: r.fetched, inserted: r.inserted, failures: failed }
  if (r.sources === 0) return { status: "failed", items: 0, error: "aucune source autorisée active", details: { ...details, outcome: "no_sources" } }
  if (failed >= r.sources) return { status: "failed", items: r.inserted, error: `${failed} source(s) en échec`, details: { ...details, outcome: "all_failed" } }
  if (failed) return { status: "success", items: r.inserted, error: `${failed} source(s) en échec`, details: { ...details, outcome: "partial" } }
  return { status: "success", items: r.inserted, error: null, details: { ...details, outcome: r.inserted ? "progressed" : "noop" } }
}
