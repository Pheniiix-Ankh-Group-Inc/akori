import "server-only"
import { env } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import { recordIncident } from "./incidents"
import { logEvent, redactString, withRun } from "./log"
import { ALERTING_KINDS, CRON_JOBS, evaluateJob, resolveRules, type CronRunRow, type CronStatus, type JobFinding } from "./cron-health"

export type CronTrigger = "schedule" | "manual" | "pipeline" | "health"

export interface CronMeta {
  trigger: CronTrigger
  attempt: number
  externalRunId: string | null
}

/**
 * Métadonnées techniques transmises par les workflows (en-têtes
 * X-BIB-Trigger, X-BIB-Run-Id, X-BIB-Run-Attempt). Valeurs strictement
 * validées ; tout le reste est ignoré.
 */
export function cronMetaFromHeaders(headers: Headers, fallback: CronTrigger = "schedule"): CronMeta {
  const t = headers.get("x-bib-trigger")?.trim()
  const trigger: CronTrigger = t === "manual" || t === "schedule" || t === "pipeline" ? t : fallback
  const attemptRaw = Number(headers.get("x-bib-run-attempt"))
  const attempt = Number.isInteger(attemptRaw) && attemptRaw >= 1 && attemptRaw <= 100 ? attemptRaw : 1
  const id = headers.get("x-bib-run-id")?.trim() ?? ""
  return { trigger, attempt, externalRunId: /^[0-9]{1,20}$/.test(id) ? id : null }
}

export interface CronOutcome {
  status: Exclude<CronStatus, "running">
  items?: number | null
  details?: Record<string, unknown>
  error?: string | null
}

let tableWarned = false
function warnTable(code: string | undefined) {
  // Table absente (migration non appliquée) : la tâche continue, une seule trace.
  if (tableWarned) return
  tableWarned = true
  logEvent("warn", "ops.cron_runs_unavailable", { code: code ?? null })
}

/**
 * Exécute une tâche planifiée en l'historisant dans cron_runs : début, fin,
 * durée, statut, volume, tentative, identifiants techniques, erreur assainie.
 * L'historisation ne bloque jamais la tâche ; une exception de la tâche est
 * toujours relancée.
 */
export async function trackCronRun<T>(job: string, meta: CronMeta, fn: (correlationId: string) => Promise<T>, outcome: (result: T) => CronOutcome): Promise<T> {
  return withRun(`cron.${job}`, async (correlationId) => {
    const admin = getAdminClient()
    const started = Date.now()
    let runId: string | null = null
    try {
      const { data, error } = await admin
        .from("cron_runs")
        .insert({ job, trigger: meta.trigger, attempt: meta.attempt, external_run_id: meta.externalRunId, correlation_id: correlationId, status: "running" })
        .select("id")
        .single()
      if (error) warnTable(error.code)
      runId = (data as { id: string } | null)?.id ?? null
    } catch {
      warnTable(undefined)
    }

    const finish = async (o: CronOutcome) => {
      if (!runId) return
      const { error } = await admin
        .from("cron_runs")
        .update({
          status: o.status,
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - started,
          items: o.items ?? null,
          error: o.error ? redactString(o.error).slice(0, 500) : null,
          details: o.details ?? {},
        })
        .eq("id", runId)
      if (error) warnTable(error.code)
    }

    try {
      const result = await fn(correlationId)
      await finish(outcome(result)).catch(() => warnTable(undefined))
      return result
    } catch (e) {
      await finish({ status: "failed", error: (e as Error)?.message ?? "error" }).catch(() => warnTable(undefined))
      throw e
    }
  }, () => ({ job, trigger: meta.trigger, attempt: meta.attempt }))
}

/** Tâches désactivées par configuration : non surveillées. */
function isEnabled(job: string): boolean {
  if (job === "news") return env.flags.newsIngest
  return true
}

export interface HealthReport {
  ok: boolean
  checkedAt: string
  source: "cron_runs" | "unavailable"
  findings: JobFinding[]
  alerted: string[]
  purged: number
}

const RETENTION_DAYS = 90

/**
 * Contrôle de santé des tâches planifiées : détecte échecs, exécutions
 * manquantes et blocages, enregistre un incident par constat (sans doublon
 * pendant MONITORING_ALERT_COOLDOWN_HOURS, 12 h par défaut) et purge
 * l'historique au-delà de 90 jours.
 */
export async function checkCronHealth(now = new Date()): Promise<HealthReport> {
  const admin = getAdminClient()
  const rules = resolveRules(process.env.MONITORING_CRON_THRESHOLDS)
  const cooldownHours = Math.min(Math.max(Number(process.env.MONITORING_ALERT_COOLDOWN_HOURS) || 12, 1), 168)
  const findings: JobFinding[] = []
  const alerted: string[] = []

  for (const [job, rule] of Object.entries(rules)) {
    const { data, error } = await admin
      .from("cron_runs")
      .select("job,status,started_at,finished_at")
      .eq("job", job)
      .order("started_at", { ascending: false })
      .limit(20)
    if (error) {
      warnTable(error.code)
      return { ok: false, checkedAt: now.toISOString(), source: "unavailable", findings: [], alerted: [], purged: 0 }
    }
    findings.push(evaluateJob(job, rule, (data ?? []) as CronRunRow[], now, isEnabled(job)))
  }

  for (const f of findings) {
    if (!ALERTING_KINDS.has(f.kind)) continue
    const kind = `cron.${f.kind}`
    const since = new Date(now.getTime() - cooldownHours * 3_600_000).toISOString()
    const { data: recent } = await admin
      .from("ops_incidents")
      .select("id")
      .eq("kind", kind)
      .contains("details", { job: f.job })
      .gte("created_at", since)
      .limit(1)
    if (recent && recent.length > 0) continue
    await recordIncident({
      kind,
      severity: f.kind === "failing" && f.consecutiveFailures >= 3 ? "critical" : "warning",
      message: `${CRON_JOBS[f.job]?.label ?? f.job} : ${f.detail}`,
      details: { job: f.job, lastStartedAt: f.lastStartedAt, lastSuccessAt: f.lastSuccessAt, consecutiveFailures: f.consecutiveFailures },
    })
    alerted.push(`${f.job}:${f.kind}`)
  }

  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString()
  const { count } = await admin.from("cron_runs").delete({ count: "exact" }).lt("started_at", cutoff)

  return {
    ok: findings.every((f) => !ALERTING_KINDS.has(f.kind)),
    checkedAt: now.toISOString(),
    source: "cron_runs",
    findings,
    alerted,
    purged: count ?? 0,
  }
}
