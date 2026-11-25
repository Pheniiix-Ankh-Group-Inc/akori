/**
 * Règles de supervision des tâches planifiées. Module pur (sans réseau ni
 * base), testé unitairement ; l'accès aux données est dans cron-runs.ts.
 *
 * Une tâche est signalée quand :
 * - « missing » : aucune exécution démarrée depuis maxGapMinutes ;
 * - « failing » : ses failAfter dernières exécutions terminées ont échoué ;
 * - « stuck »   : une exécution est restée « running » au-delà de stuckMinutes.
 * Les seuils sont réglables sans déploiement via MONITORING_CRON_THRESHOLDS
 * (JSON), par exemple {"luma-sync":{"maxGapMinutes":240}}.
 */

export type CronStatus = "running" | "success" | "failed" | "skipped"

export interface CronRunRow {
  job: string
  status: CronStatus
  started_at: string
  finished_at: string | null
}

export interface CronJobRule {
  /** Libellé lisible dans les alertes. */
  label: string
  /** Planification source (pour la documentation et les alertes). */
  schedule: string
  /** Écart maximal toléré entre deux démarrages, en minutes. */
  maxGapMinutes: number
  /** Nombre d'échecs consécutifs avant alerte. */
  failAfter: number
  /** Durée au-delà de laquelle une exécution « running » est considérée bloquée. */
  stuckMinutes: number
}

/**
 * Tâches réellement présentes dans le dépôt (.github/workflows/*.yml →
 * /api/cron/*). Les seuils tiennent compte des retards connus des
 * planifications GitHub Actions, qui sautent souvent des créneaux rapprochés.
 */
export const CRON_JOBS: Record<string, CronJobRule> = {
  "luma-sync": { label: "Synchronisation Luma", schedule: "events-sync.yml, toutes les 10 min", maxGapMinutes: 180, failAfter: 3, stuckMinutes: 15 },
  news: { label: "Veille d'actualités", schedule: "news-ingest.yml, quotidien 10:41 UTC", maxGapMinutes: 26 * 60, failAfter: 1, stuckMinutes: 15 },
  newsletter: { label: "Cycle newsletter (generate, check, send)", schedule: "newsletter.yml, quotidien", maxGapMinutes: 26 * 60, failAfter: 1, stuckMinutes: 15 },
  "sob-refresh": { label: "Rafraîchissement State of BIB", schedule: "refresh-data.yml, après chaque contrôle", maxGapMinutes: 26 * 60, failAfter: 2, stuckMinutes: 15 },
}

export type JobFindingKind = "ok" | "missing" | "failing" | "stuck" | "never_run" | "disabled"

export interface JobFinding {
  job: string
  kind: JobFindingKind
  lastStartedAt: string | null
  lastSuccessAt: string | null
  consecutiveFailures: number
  detail: string
}

/** Fusionne les seuils par défaut et ceux de MONITORING_CRON_THRESHOLDS (valeurs invalides ignorées). */
export function resolveRules(raw: string | undefined, defaults: Record<string, CronJobRule> = CRON_JOBS): Record<string, CronJobRule> {
  const rules: Record<string, CronJobRule> = {}
  for (const [k, v] of Object.entries(defaults)) rules[k] = { ...v }
  if (!raw) return rules
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return rules
  }
  if (!parsed || typeof parsed !== "object") return rules
  for (const [job, override] of Object.entries(parsed as Record<string, unknown>)) {
    if (!rules[job] || !override || typeof override !== "object") continue
    for (const key of ["maxGapMinutes", "failAfter", "stuckMinutes"] as const) {
      const n = (override as Record<string, unknown>)[key]
      if (typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 60 * 24 * 31) rules[job][key] = n
    }
  }
  return rules
}

const minutesBetween = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 60_000

/**
 * Évalue une tâche à partir de ses exécutions les plus récentes (triées de la
 * plus récente à la plus ancienne).
 */
export function evaluateJob(job: string, rule: CronJobRule, runs: CronRunRow[], now: Date, enabled = true): JobFinding {
  const lastStartedAt = runs[0]?.started_at ?? null
  const lastSuccessAt = runs.find((r) => r.status === "success")?.started_at ?? null
  const finished = runs.filter((r) => r.status !== "running" && r.status !== "skipped")
  let consecutiveFailures = 0
  for (const r of finished) {
    if (r.status !== "failed") break
    consecutiveFailures++
  }
  const base = { job, lastStartedAt, lastSuccessAt, consecutiveFailures }
  if (!enabled) return { ...base, kind: "disabled", detail: "Tâche désactivée par configuration : non surveillée." }

  const stuck = runs.find((r) => r.status === "running" && minutesBetween(now, new Date(r.started_at)) > rule.stuckMinutes)
  if (stuck) return { ...base, kind: "stuck", detail: `Exécution démarrée le ${stuck.started_at} toujours en cours après ${rule.stuckMinutes} min.` }
  if (consecutiveFailures >= rule.failAfter) return { ...base, kind: "failing", detail: `${consecutiveFailures} échec(s) consécutif(s) (seuil ${rule.failAfter}).` }
  if (!lastStartedAt) return { ...base, kind: "never_run", detail: "Aucune exécution enregistrée." }
  const gap = minutesBetween(now, new Date(lastStartedAt))
  if (gap > rule.maxGapMinutes) return { ...base, kind: "missing", detail: `Aucune exécution depuis ${Math.round(gap)} min (seuil ${rule.maxGapMinutes} min).` }
  return { ...base, kind: "ok", detail: "Conforme." }
}

/** Constats qui justifient une alerte (« never_run » n'alerte pas : table neuve). */
export const ALERTING_KINDS: ReadonlySet<JobFindingKind> = new Set(["missing", "failing", "stuck"])
