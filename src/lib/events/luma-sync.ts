import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import { safeFetchText } from "@/lib/net/safe-fetch"
import { recordIncident } from "@/lib/ops/incidents"
import { logEvent } from "@/lib/ops/log"
import { IcalError, parseIcal } from "./ical"
import { assertLumaFeedUrl, lumaFeedUrl, normalizeEvent, type SyncEventPayload } from "./luma-normalize"

export type SyncTrigger = "schedule" | "manual" | "upload"

export interface LumaSyncReport {
  ok: boolean
  runId: string | null
  skipped?: "running"
  counts?: Record<string, number>
  feedEvents?: number
  candidateUrl?: boolean
  warnings: string[]
  error?: string
}

/** Une exécution « running » plus ancienne est considérée comme interrompue. */
export /** Seuils du contrôle de complétude du flux. */
const SHRINK_MIN_EVENTS = 4
const SHRINK_RATIO = 0.5
const STALE_RUN_MS = 30 * 60 * 1000
const MAX_FEED_BYTES = 10 * 1024 * 1024
const RETRIES = [0, 2000, 6000]

type FetchFn = (url: string) => Promise<{ text: string; finalUrl: string }>

async function defaultFetch(url: string) {
  assertLumaFeedUrl(url)
  const r = await safeFetchText(url, { maxBytes: MAX_FEED_BYTES, timeoutMs: 20_000, headers: { accept: "text/calendar, text/plain;q=0.8" } })
  // Une redirection ne doit pas quitter les hôtes Luma.
  assertLumaFeedUrl(r.finalUrl)
  return { text: r.text, finalUrl: r.finalUrl }
}

/** Récupération avec reprises bornées (3 tentatives, attente croissante). */
export async function fetchWithRetry(url: string, fetchFn: FetchFn = defaultFetch, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  let last: unknown
  for (const wait of RETRIES) {
    if (wait) await sleep(wait)
    try {
      return await fetchFn(url)
    } catch (e) {
      last = e
      // Refus de sécurité ou URL invalide : inutile de réessayer.
      if (/non autorisé|invalide|private_address|too_large/.test((e as Error).message)) break
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

/**
 * Synchronisation Luma → Supabase.
 *  - verrou : une seule exécution à la fois (les exécutions bloquées > 30 min
 *    sont marquées en échec puis remplacées) ;
 *  - lecture du flux complet (aucune pagination arbitraire), contrôle du
 *    format VCALENDAR, normalisation, empreintes ;
 *  - écriture atomique et idempotente par la RPC sync_luma_events ;
 *  - un import manuel de fichier .ics (historique) n'est jamais « complet » :
 *    il ne marque aucun événement comme absent.
 */
export async function runLumaSync(
  opts: { trigger: SyncTrigger; requestedBy?: string | null; icsText?: string; now?: Date },
  deps: { admin?: SupabaseClient; fetchFn?: FetchFn; sleep?: (ms: number) => Promise<void> } = {},
): Promise<LumaSyncReport> {
  const admin = deps.admin ?? getAdminClient()
  const now = opts.now ?? new Date()
  // Verrou ATOMIQUE côté PostgreSQL (migration 0012) : la clôture des
  // exécutions interrompues, le contrôle « déjà en cours » et l'ouverture se
  // font dans une seule fonction, protégée par un index unique partiel.
  // Fail closed if the atomic lock introduced in migration 0012 is missing.
  const begin = await admin.rpc("begin_event_sync_run", {
    p_trigger: opts.trigger, p_requested_by: opts.requestedBy ?? null,
    p_stale_minutes: Math.round(STALE_RUN_MS / 60000),
  })
  if (begin.error) return {
    ok: false, runId: null, warnings: [],
    error: /PGRST202|42883|could not find/i.test(`${begin.error.code ?? ""} ${begin.error.message ?? ""}`)
      ? "migration 0012 manquante : verrou atomique Luma indisponible"
      : "verrou transactionnel Luma indisponible",
  }
  if (!begin.data) return { ok: true, runId: null, skipped: "running", warnings: [] }
  const runId = String(begin.data)

  let candidateUrl = false
  let host: string | null = null
  try {
    let text: string
    if (opts.icsText !== undefined) {
      text = opts.icsText
      host = "upload"
    } else {
      const feed = lumaFeedUrl(env.luma.icalUrl, env.luma.calendarId)
      candidateUrl = feed.candidate
      const r = await fetchWithRetry(feed.url, deps.fetchFn, deps.sleep)
      text = r.text
      host = new URL(r.finalUrl).hostname
    }
    const cal = parseIcal(text, now.getTime())
    const fallbackTz = cal.timeZone ?? "America/Toronto"
    const payload: SyncEventPayload[] = cal.events.map((e) => normalizeEvent(e, fallbackTz))
    const warnings = [...cal.warnings]
    if (candidateUrl) warnings.push("URL iCal construite automatiquement : configurer LUMA_ICAL_URL avec l'adresse copiée depuis Luma.")
    if (payload.length === 0) throw new Error("flux iCal vide ou sans événement exploitable : aucune écriture effectuée")

    // Contrôle de complétude : un flux qui perd plus de la moitié de ses
    // événements par rapport à la dernière synchronisation complète réussie
    // est traité comme PARTIEL (rien n'est marqué absent) et signalé.
    let complete = opts.trigger !== "upload"
    if (complete) {
      const { data: prev } = await admin
        .from("event_sync_runs")
        .select("feed_events")
        .eq("status", "succeeded")
        .neq("trigger", "upload")
        .order("started_at", { ascending: false })
        .limit(1)
      const before = Number((prev as { feed_events?: number }[] | null)?.[0]?.feed_events ?? 0)
      if (before >= SHRINK_MIN_EVENTS && payload.length < before * SHRINK_RATIO) {
        complete = false
        const w = `Flux anormalement réduit (${payload.length} événements contre ${before}) : traité comme partiel, aucun événement marqué absent.`
        warnings.push(w)
        try {
          await recordIncident({ kind: "events.luma_feed_shrunk", severity: "warning", message: w, details: { runId, before, now: payload.length } })
        } catch {
          /* l'avertissement reste dans le journal de l'exécution */
        }
      }
    }

    const { data: counts, error } = await admin.rpc("sync_luma_events", { p_run_id: runId, p_events: payload, p_complete: complete })
    if (error) throw new Error(`écriture refusée : ${error.message}`)

    const finalization = await admin
      .from("event_sync_runs")
      .update({ status: "succeeded", finished_at: new Date().toISOString(), feed_host: host, feed_bytes: Buffer.byteLength(text), warnings: warnings.slice(0, 50) })
      .eq("id", runId)
    if (finalization.error) throw new Error("finalisation du journal Luma impossible après synchronisation")
    logEvent("info", "events.luma_sync", { runId, trigger: opts.trigger, events: payload.length, ...(counts as Record<string, number>) })
    return { ok: true, runId, counts: counts as Record<string, number>, feedEvents: payload.length, candidateUrl, warnings }
  } catch (e) {
    const message = e instanceof IcalError ? `flux invalide : ${e.message}` : (e as Error).message
    await admin.from("event_sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), feed_host: host, error: message.slice(0, 1000) }).eq("id", runId)
    try {
      await recordIncident({ kind: "events.luma_sync_failed", severity: "warning", message: `Synchronisation Luma en échec : ${message.slice(0, 200)}`, details: { runId, trigger: opts.trigger } })
    } catch {
      /* l'échec reste visible dans event_sync_runs */
    }
    return { ok: false, runId, candidateUrl, warnings: [], error: message }
  }
}
