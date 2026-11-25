import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CRON_JOBS, evaluateJob, resolveRules, type CronRunRow } from "@/lib/ops/cron-health"

const NOW = new Date("2026-11-25T12:00:00Z")
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString()
const run = (status: CronRunRow["status"], minAgo: number): CronRunRow => ({ job: "luma-sync", status, started_at: ago(minAgo), finished_at: status === "running" ? null : ago(minAgo - 1) })
const rule = CRON_JOBS["luma-sync"]

describe("règles de supervision des CRON", () => {
  it("conforme quand la dernière exécution est récente et réussie", () => {
    expect(evaluateJob("luma-sync", rule, [run("success", 20)], NOW).kind).toBe("ok")
  })
  it("détecte une exécution manquante selon l'horaire attendu", () => {
    const f = evaluateJob("luma-sync", rule, [run("success", 600)], NOW)
    expect(f.kind).toBe("missing")
    expect(f.lastSuccessAt).toBe(ago(600))
  })
  it("détecte des échecs consécutifs au-delà du seuil, en ignorant les exécutions sautées", () => {
    const runs = [run("failed", 10), run("skipped", 20), run("failed", 30), run("failed", 40), run("success", 50)]
    const f = evaluateJob("luma-sync", rule, runs, NOW)
    expect(f.kind).toBe("failing")
    expect(f.consecutiveFailures).toBe(3)
    expect(evaluateJob("luma-sync", rule, runs.slice(2), NOW).kind).toBe("ok")
  })
  it("détecte une exécution bloquée en cours", () => {
    expect(evaluateJob("luma-sync", rule, [run("running", 40)], NOW).kind).toBe("stuck")
  })
  it("ne surveille pas une tâche désactivée et n'alerte pas sur une table neuve", () => {
    expect(evaluateJob("news", CRON_JOBS.news, [], NOW, false).kind).toBe("disabled")
    expect(evaluateJob("news", CRON_JOBS.news, [], NOW).kind).toBe("never_run")
  })
  it("seuils configurables, valeurs invalides ignorées", () => {
    const r = resolveRules('{"luma-sync":{"maxGapMinutes":240,"failAfter":-1},"inconnu":{"maxGapMinutes":5}}')
    expect(r["luma-sync"].maxGapMinutes).toBe(240)
    expect(r["luma-sync"].failAfter).toBe(rule.failAfter)
    expect(r.inconnu).toBeUndefined()
    expect(resolveRules("pas du json")["news"].maxGapMinutes).toBe(CRON_JOBS.news.maxGapMinutes)
  })
})

// ---- historisation et contrôle de santé, sur une base simulée ----
type Row = Record<string, unknown>
const db: { cron_runs: Row[]; ops_incidents: Row[]; missingTable: boolean } = { cron_runs: [], ops_incidents: [], missingTable: false }

function table(name: "cron_runs" | "ops_incidents") {
  const filters: ((r: Row) => boolean)[] = []
  let op: "select" | "insert" | "update" | "delete" = "select"
  let payload: Row = {}
  let limit = Infinity
  const rows = () => db[name].filter((r) => filters.every((f) => f(r)))
  const exec = () => {
    if (name === "cron_runs" && db.missingTable) return { data: null, error: { code: "42P01" }, count: null }
    if (op === "insert") {
      const row = { id: `id-${db[name].length + 1}`, created_at: new Date().toISOString(), ...payload }
      db[name].push(row)
      return { data: row, error: null }
    }
    if (op === "update") {
      rows().forEach((r) => Object.assign(r, payload))
      return { data: null, error: null }
    }
    if (op === "delete") {
      const doomed = rows()
      db[name] = db[name].filter((r) => !doomed.includes(r))
      return { data: null, error: null, count: doomed.length }
    }
    const data = rows().sort((a, b) => String(b.started_at ?? b.created_at).localeCompare(String(a.started_at ?? a.created_at))).slice(0, limit)
    return { data, error: null }
  }
  const q: Record<string, unknown> = {
    select: () => q,
    insert: (p: Row) => ((op = "insert"), (payload = p), q),
    update: (p: Row) => ((op = "update"), (payload = p), q),
    delete: () => ((op = "delete"), q),
    eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), q),
    gte: (k: string, v: string) => (filters.push((r) => String(r[k]) >= v), q),
    lt: (k: string, v: string) => (filters.push((r) => String(r[k]) < v), q),
    contains: (k: string, v: Row) => (filters.push((r) => Object.entries(v).every(([kk, vv]) => (r[k] as Row | undefined)?.[kk] === vv)), q),
    order: () => q,
    limit: (n: number) => ((limit = n), q),
    single: async () => exec(),
    then: (resolve: (v: unknown) => unknown) => resolve(exec()),
  }
  return q
}

vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: (n: "cron_runs" | "ops_incidents") => table(n) }) }))
vi.mock("@/lib/brevo", () => ({ sendInternalAlert: vi.fn() }))

const { trackCronRun, checkCronHealth, cronMetaFromHeaders } = await import("@/lib/ops/cron-runs")

describe("historisation des exécutions (cron_runs)", () => {
  let logs: string[]
  beforeEach(() => {
    db.cron_runs = []
    db.ops_incidents = []
    db.missingTable = false
    logs = []
    for (const m of ["log", "warn", "error"] as const) vi.spyOn(console, m).mockImplementation((l: unknown) => void logs.push(String(l)))
  })
  afterEach(() => vi.restoreAllMocks())

  const meta = { trigger: "schedule" as const, attempt: 2, externalRunId: "123456" }

  it("enregistre début, fin, durée, statut, volume, tentative et identifiants", async () => {
    const r = await trackCronRun("luma-sync", meta, async () => ({ n: 7 }), (x) => ({ status: "success", items: x.n }))
    expect(r).toEqual({ n: 7 })
    const row = db.cron_runs[0]
    expect(row).toMatchObject({ job: "luma-sync", status: "success", items: 7, attempt: 2, external_run_id: "123456", trigger: "schedule" })
    expect(typeof row.correlation_id).toBe("string")
    expect(row.finished_at).toBeTruthy()
    expect(row.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it("en cas d'exception : statut failed, message assaini, erreur relancée (jamais masquée)", async () => {
    await expect(trackCronRun("news", meta, async () => { throw new Error("Brevo refused contact a@b.co with Bearer abcdefghijklmnop") }, () => ({ status: "success" }))).rejects.toThrow("Brevo refused")
    const row = db.cron_runs[0]
    expect(row.status).toBe("failed")
    expect(String(row.error)).not.toContain("a@b.co")
    expect(String(row.error)).not.toContain("abcdefghijklmnop")
    expect(logs.join("\n")).not.toContain("a@b.co")
    const end = logs.map((l) => JSON.parse(l)).find((l) => l.event === "cron.news.end")
    expect(end).toMatchObject({ level: "error", status: "error" })
  })

  it("table absente : la tâche s'exécute quand même, une seule trace d'avertissement", async () => {
    db.missingTable = true
    const r = await trackCronRun("luma-sync", meta, async () => "ok", () => ({ status: "success" }))
    expect(r).toBe("ok")
    expect(logs.filter((l) => l.includes("ops.cron_runs_unavailable")).length).toBeLessThanOrEqual(1)
  })

  it("contrôle de santé : un incident par constat, sans doublon pendant la fenêtre", async () => {
    const old = new Date(Date.now() - 10 * 3_600_000).toISOString()
    db.cron_runs.push({ job: "luma-sync", status: "success", started_at: old, finished_at: old })
    const first = await checkCronHealth()
    expect(first.alerted).toContain("luma-sync:missing")
    expect(db.ops_incidents.filter((i) => i.kind === "cron.missing")).toHaveLength(1)
    const second = await checkCronHealth()
    expect(second.alerted).toEqual([])
    expect(db.ops_incidents.filter((i) => i.kind === "cron.missing")).toHaveLength(1)
  })

  it("purge l'historique au-delà de 90 jours", async () => {
    const veryOld = new Date(Date.now() - 100 * 86_400_000).toISOString()
    db.cron_runs.push({ job: "news", status: "success", started_at: veryOld, finished_at: veryOld })
    const report = await checkCronHealth()
    expect(report.purged).toBe(1)
  })

  it("métadonnées d'en-têtes strictement validées", () => {
    const h = new Headers({ "x-bib-run-id": "987", "x-bib-run-attempt": "3", "x-bib-trigger": "manual" })
    expect(cronMetaFromHeaders(h)).toEqual({ trigger: "manual", attempt: 3, externalRunId: "987" })
    const bad = new Headers({ "x-bib-run-id": "1;drop", "x-bib-run-attempt": "999", "x-bib-trigger": "evil" })
    expect(cronMetaFromHeaders(bad, "pipeline")).toEqual({ trigger: "pipeline", attempt: 1, externalRunId: null })
  })
})

describe("câblage de la supervision", () => {
  it("chaque route CRON historise ses exécutions et le contrôle de santé est planifié par Vercel", async () => {
    const { readFileSync } = await import("node:fs")
    for (const r of ["luma-sync", "news", "newsletter", "sob-refresh", "sob-insights"]) {
      expect(readFileSync(`src/app/api/cron/${r}/route.ts`, "utf8"), r).toContain("trackCronRun(")
    }
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8"))
    expect(vercel.crons).toEqual([{ path: "/api/cron/health", schedule: expect.stringMatching(/^\d+ \d+ \* \* \*$/) }])
    expect(readFileSync("src/app/api/cron/health/route.ts", "utf8")).toContain("isAuthorizedCron")
  })
  it("les workflows transmettent les identifiants d'exécution GitHub, jamais de secret supplémentaire", async () => {
    const { readFileSync } = await import("node:fs")
    for (const w of ["events-sync", "refresh-data"]) {
      const y = readFileSync(`.github/workflows/${w}.yml`, "utf8")
      expect(y, w).toContain('X-BIB-Run-Id: ${GITHUB_RUN_ID}')
      expect(y, w).toContain('X-BIB-Run-Attempt: ${GITHUB_RUN_ATTEMPT}')
    }
    expect(readFileSync("scripts/run_cron.py", "utf8")).toContain("run_headers(os.environ)")
  })
  it("OpenTelemetry : service bib-web, erreurs serveur journalisées sans message brut", async () => {
    const { readFileSync } = await import("node:fs")
    const inst = readFileSync("src/instrumentation.ts", "utf8")
    expect(inst).toContain('serviceName: "bib-web"')
    expect(inst).toContain("onRequestError")
    expect(inst).not.toMatch(/err\.message|error\.message/)
  })
})
