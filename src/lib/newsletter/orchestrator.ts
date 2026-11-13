import "server-only"
import { env, isAiConfigured, isBrevoConfigured } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import { AiBudgetError, AiDisabledError, newBudget, type AiBudget } from "@/lib/ai/engine"
import { createCampaign, findCampaignByName, listIdFor, sendCampaignNow, type NewsletterLocale } from "@/lib/brevo"
import { recordIncident } from "@/lib/ops/incidents"
import { gatherInputs, type EditionInputs } from "./inputs"
import { draftEdition, draftSchema, type EditionDraft } from "./compose"
import { renderEdition } from "./render"
import { checkRendered, failedChecks, runAllChecks, type CheckResult } from "./checks"
import { sendSlotFor, sendWindowState, weekStartFor } from "./schedule"

/**
 * Cycle hebdomadaire autonome (America/Toronto) :
 *   lundi    → generate : paire FR/EN rédigée, rendue, contrôlée, stockée ;
 *   mardi    → check    : recontrôle, régénération bornée si nécessaire ;
 *   mercredi → send     : 09:00 → 09:59, envoi SEULEMENT si FR ET EN sont
 *              validées ; sinon annulation de la semaine, alerte e-mail,
 *              aucun rattrapage.
 * Aucune approbation humaine systématique. Idempotent : verrou par statut,
 * clé d'idempotence par langue, réconciliation avec Brevo.
 */

const LOCALES: NewsletterLocale[] = ["fr", "en"]

interface Cycle {
  id: string
  week_start: string
  send_slot: string
  status: string
  regen_attempts: number
  updated_at?: string
}

export interface StepResult {
  step: string
  weekStart: string
  status: string
  detail?: string
}

/** Un cycle resté « sending » plus de 30 minutes est considéré interrompu. */
export const SENDING_STALE_MS = 30 * 60 * 1000
function isStaleSending(cycle: Cycle, now: Date): boolean {
  const updated = Date.parse(cycle.updated_at ?? "")
  return Number.isFinite(updated) && now.getTime() - updated > SENDING_STALE_MS
}

async function getOrCreateCycle(now: Date): Promise<Cycle> {
  const admin = getAdminClient()
  const weekStart = weekStartFor(now)
  const { data: existing } = await admin.from("newsletter_cycles").select("*").eq("week_start", weekStart).maybeSingle()
  if (existing) return existing as Cycle
  const { data, error } = await admin
    .from("newsletter_cycles")
    .insert({ week_start: weekStart, send_slot: sendSlotFor(weekStart), status: "collecting" })
    .select("*")
    .single()
  if (error || !data) {
    // Course entre deux exécutions : relire.
    const { data: again } = await admin.from("newsletter_cycles").select("*").eq("week_start", weekStart).single()
    return again as Cycle
  }
  return data as Cycle
}

async function setCycle(id: string, patch: Record<string, unknown>, expectedStatus?: string[]): Promise<boolean> {
  let q = getAdminClient().from("newsletter_cycles").update(patch).eq("id", id)
  if (expectedStatus?.length) q = q.in("status", expectedStatus)
  const { data } = await q.select("id")
  return (data?.length ?? 0) > 0
}

/** Compose, rend et contrôle une paire FR/EN ; enregistre éditions et contrôles. */
async function produceAndStore(cycle: Cycle, inputs: EditionInputs, draft: EditionDraft, aiRunId: string | null) {
  const admin = getAdminClient()
  const checks = runAllChecks(draft, inputs, cycle.send_slot)
  const rendered = Object.fromEntries(LOCALES.map((l) => [l, renderEdition(draft[l], inputs, l)])) as Record<NewsletterLocale, ReturnType<typeof renderEdition>>
  const renderChecks: Record<NewsletterLocale, CheckResult[]> = {
    fr: checkRendered("fr", rendered.fr.html, rendered.fr.links, inputs, env.siteUrl),
    en: checkRendered("en", rendered.en.html, rendered.en.links, inputs, env.siteUrl),
  }

  const { data: last } = await admin.from("newsletter_editions").select("version").eq("cycle_id", cycle.id).order("version", { ascending: false }).limit(1)
  const version = ((last?.[0] as { version: number } | undefined)?.version ?? 0) + 1
  const sources = (l: NewsletterLocale) => ({
    news: draft[l].blockchain_news.map((n) => inputs.news.find((x) => x.id === n.news_id)).filter(Boolean).map((n) => ({ id: n!.id, url: n!.url, source: n!.sourceName })),
    events: draft[l].bib_events.map((e) => e.event_id),
    stories: draft[l].bib_highlights.map((h) => h.story_id),
    sob_version: inputs.sob.versionId,
  })

  const all: CheckResult[] = []
  const editionIds: string[] = []
  for (const l of LOCALES) {
    const results = [...checks[l], ...renderChecks[l], ...checks.pair]
    all.push(...results)
    const failed = failedChecks(results)
    const { data: ed } = await admin
      .from("newsletter_editions")
      .insert({
        cycle_id: cycle.id,
        locale: l,
        version,
        status: failed.length ? "blocked" : "draft",
        subject: draft[l].subject,
        preheader: draft[l].preheader,
        content: draft[l],
        html: rendered[l].html,
        sources: sources(l),
        ai_run_id: aiRunId,
      })
      .select("id")
      .single()
    const editionId = (ed as { id: string } | null)?.id
    if (!editionId) throw new Error(`Enregistrement de l'édition ${l} v${version} impossible.`)
    editionIds.push(editionId)
    if (editionId) {
      await admin.from("edition_checks").insert(results.map((r) => ({ edition_id: editionId, check_key: r.key, blocking: r.blocking, passed: r.passed, details: r.details })))
    }
  }
  return { failed: failedChecks(all), version, editionIds }
}

/**
 * Valide UNE paire versionnée (celle qui vient d'être contrôlée) et invalide
 * toutes les autres versions du cycle : la paire contrôlée, validée et envoyée
 * est toujours la même.
 */
async function validatePair(cycleId: string, editionIds: string[]) {
  // Transaction unique côté base (migration 0008) : aucune fenêtre où toutes
  // les éditions seraient annulées ou deux paires validées.
  const { error } = await getAdminClient().rpc("newsletter_validate_pair", { p_cycle_id: cycleId, p_edition_ids: editionIds })
  if (error) throw new Error(`Validation de la paire impossible (${error.code ?? "?"}).`)
}

async function block(cycle: Cycle, reason: string, details: Record<string, unknown> = {}) {
  await setCycle(cycle.id, { status: "blocked", cancelled_reason: reason })
  await recordIncident({ kind: "newsletter.blocked", severity: "warning", cycleId: cycle.id, message: reason, details })
}

/** Lundi : génération de la paire FR/EN. */
export async function runGenerate(now = new Date()): Promise<StepResult> {
  const cycle = await getOrCreateCycle(now)
  if (!["collecting", "drafting", "blocked"].includes(cycle.status) || cycle.status === "blocked" && cycle.regen_attempts > 0) {
    return { step: "generate", weekStart: cycle.week_start, status: cycle.status, detail: "déjà traité" }
  }
  if (!(await setCycle(cycle.id, { status: "drafting" }, ["collecting", "drafting", "blocked"]))) {
    return { step: "generate", weekStart: cycle.week_start, status: cycle.status, detail: "verrou non obtenu" }
  }
  if (!isAiConfigured()) {
    await block(cycle, "Moteur IA désactivé ou non configuré : aucune édition générée.")
    return { step: "generate", weekStart: cycle.week_start, status: "blocked", detail: "ai_disabled" }
  }
  try {
    const inputs = await gatherInputs(cycle.send_slot)
    const budget = newBudget()
    const { value, runId } = await draftEdition(inputs, budget)
    const { failed } = await produceAndStore(cycle, inputs, value, runId)
    await setCycle(cycle.id, { status: failed.length ? "blocked" : "drafted", cancelled_reason: failed.length ? `Contrôles en échec : ${failed.map((f) => f.key).join(", ")}` : null })
    return { step: "generate", weekStart: cycle.week_start, status: failed.length ? "blocked" : "drafted", detail: `${failed.length} contrôle(s) en échec` }
  } catch (e) {
    await block(cycle, `Génération impossible : ${(e as Error).message}`)
    return { step: "generate", weekStart: cycle.week_start, status: "blocked", detail: (e as Error).message }
  }
}

async function latestPair(cycleId: string) {
  const { data } = await getAdminClient()
    .from("newsletter_editions")
    .select("id, locale, version, status, content")
    .eq("cycle_id", cycleId)
    .order("version", { ascending: false })
    .limit(2)
  const rows = (data ?? []) as { id: string; locale: NewsletterLocale; version: number; status: string; content: unknown }[]
  if (rows.length !== 2 || rows[0].version !== rows[1].version) return null
  const byLocale = Object.fromEntries(rows.map((r) => [r.locale, r]))
  const draft = draftSchema.safeParse({ fr: byLocale.fr?.content, en: byLocale.en?.content })
  return draft.success ? { draft: draft.data, rows } : null
}

/** Mardi : recontrôle et régénération bornée. */
export async function runCheck(now = new Date()): Promise<StepResult> {
  let cycle = await getOrCreateCycle(now)
  // Génération du lundi manquée : on la tente une fois avant le contrôle.
  if (cycle.status === "collecting") {
    await runGenerate(now)
    cycle = await getOrCreateCycle(now)
  }
  if (!["drafted", "blocked"].includes(cycle.status)) {
    return { step: "check", weekStart: cycle.week_start, status: cycle.status, detail: "rien à contrôler" }
  }
  if (!(await setCycle(cycle.id, { status: "checking" }, ["drafted", "blocked"]))) {
    return { step: "check", weekStart: cycle.week_start, status: cycle.status, detail: "verrou non obtenu" }
  }

  let attempts = cycle.regen_attempts
  const budget: AiBudget = newBudget()
  try {
    let inputs = await gatherInputs(cycle.send_slot)
    const previous = await latestPair(cycle.id)
    // Recontrôle de la dernière paire : elle est réenregistrée comme NOUVELLE
    // version immuable, et c'est cette version-là qui pourra être validée.
    let stored = previous
      ? await produceAndStore(cycle, inputs, previous.draft, null)
      : { failed: [{ key: "missing_edition", blocking: true, passed: false, details: {} }] as CheckResult[], version: 0, editionIds: [] as string[] }

    while (stored.failed.length && attempts < env.newsletter.maxRegenerations && isAiConfigured()) {
      attempts += 1
      await setCycle(cycle.id, { regen_attempts: attempts })
      inputs = await gatherInputs(cycle.send_slot)
      const { value, runId } = await draftEdition(inputs, budget, stored.failed.map((f) => `${f.key}: ${JSON.stringify(f.details).slice(0, 200)}`))
      stored = await produceAndStore(cycle, inputs, value, runId)
    }

    if (stored.failed.length || stored.editionIds.length !== LOCALES.length) {
      await block(cycle, `Édition non éligible après ${attempts} régénération(s).`, { failed: stored.failed.map((f) => f.key) })
      return { step: "check", weekStart: cycle.week_start, status: "blocked", detail: stored.failed.map((f) => f.key).join(", ") }
    }
    await validatePair(cycle.id, stored.editionIds)
    await setCycle(cycle.id, { status: "eligible", cancelled_reason: null })
    return { step: "check", weekStart: cycle.week_start, status: "eligible" }
  } catch (e) {
    const reason = e instanceof AiBudgetError || e instanceof AiDisabledError ? (e as Error).message : `Contrôle impossible : ${(e as Error).message}`
    await block(cycle, reason)
    return { step: "check", weekStart: cycle.week_start, status: "blocked", detail: reason }
  }
}

async function cancel(cycle: Cycle, reason: string) {
  await setCycle(cycle.id, { status: "cancelled", cancelled_reason: reason }, ["collecting", "drafting", "drafted", "checking", "blocked", "eligible"])
  await getAdminClient().from("newsletter_editions").update({ status: "cancelled" }).eq("cycle_id", cycle.id).neq("status", "sent")
  await recordIncident({ kind: "newsletter.cancelled", severity: "warning", cycleId: cycle.id, message: `Édition de la semaine du ${cycle.week_start} annulée : ${reason}. Aucun rattrapage ; reprise la semaine suivante.` })
}

/** Mercredi 09:00 (Toronto) : envoi des deux langues ou annulation. */
export async function runSend(now = new Date()): Promise<StepResult> {
  const cycle = await getOrCreateCycle(now)
  const window = sendWindowState(now, cycle.send_slot)
  if (cycle.status === "sending" && isStaleSending(cycle, now)) {
    // Exécution interrompue pendant l'envoi : résultat incertain. Aucun
    // renvoi automatique ; on fige l'état et on alerte.
    if (await setCycle(cycle.id, { status: "failed", cancelled_reason: "envoi interrompu : résultat incertain, vérification manuelle requise" }, ["sending"])) {
      await recordIncident({ kind: "newsletter.stuck_sending", severity: "critical", cycleId: cycle.id, message: "Envoi interrompu : vérifier l'état des campagnes dans Brevo. Aucun renvoi automatique." })
    }
    return { step: "send", weekStart: cycle.week_start, status: "failed", detail: "envoi interrompu" }
  }
  if (["sent", "partially_sent", "cancelled", "sending", "failed"].includes(cycle.status)) {
    return { step: "send", weekStart: cycle.week_start, status: cycle.status, detail: "déjà traité" }
  }
  if (window === "before") return { step: "send", weekStart: cycle.week_start, status: cycle.status, detail: "créneau non atteint" }
  if (window === "closed") {
    await cancel(cycle, "créneau du mercredi 09:00 dépassé")
    return { step: "send", weekStart: cycle.week_start, status: "cancelled", detail: "créneau dépassé" }
  }
  if (!env.flags.newsletterAutosend || !isBrevoConfigured()) {
    await cancel(cycle, "envoi automatique désactivé ou Brevo non configuré")
    return { step: "send", weekStart: cycle.week_start, status: "cancelled", detail: "autosend_disabled" }
  }
  if (cycle.status !== "eligible") {
    await cancel(cycle, `édition non éligible (statut ${cycle.status})`)
    return { step: "send", weekStart: cycle.week_start, status: "cancelled" }
  }

  // La paire envoyée est EXACTEMENT la paire validée (même version).
  const admin = getAdminClient()
  const { data: validated } = await admin
    .from("newsletter_editions")
    .select("id, locale, version, subject, preheader, html, content")
    .eq("cycle_id", cycle.id)
    .eq("status", "validated")
  const rows = (validated ?? []) as { id: string; locale: NewsletterLocale; version: number; subject: string; preheader: string | null; html: string; content: unknown }[]
  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, rows.find((r) => r.locale === l)]))
  const parsedPair = draftSchema.safeParse({ fr: byLocale.fr?.content, en: byLocale.en?.content })
  if (rows.length !== LOCALES.length || !byLocale.fr || !byLocale.en || byLocale.fr.version !== byLocale.en.version || !parsedPair.success) {
    await cancel(cycle, "paire validée introuvable ou incohérente")
    return { step: "send", weekStart: cycle.week_start, status: "cancelled" }
  }

  // Dernier contrôle bloquant sur cette même paire (dates, éléments…).
  const inputs = await gatherInputs(cycle.send_slot)
  const final = runAllChecks(parsedPair.data, inputs, cycle.send_slot)
  const finalFailed = failedChecks([...final.fr, ...final.en, ...final.pair])
  if (finalFailed.length) {
    await cancel(cycle, `contrôle final en échec : ${finalFailed.map((f) => f.key).join(", ")}`)
    return { step: "send", weekStart: cycle.week_start, status: "cancelled" }
  }

  // La fenêtre est revérifiée juste avant le verrou : les contrôles qui
  // précèdent peuvent avoir pris du temps (aucun envoi après 09:59).
  if (sendWindowState(new Date(), cycle.send_slot) !== "open") {
    await cancel(cycle, "créneau du mercredi 09:00 dépassé pendant les contrôles finaux")
    return { step: "send", weekStart: cycle.week_start, status: "cancelled", detail: "créneau dépassé" }
  }

  // Verrou : un seul envoi possible.
  if (!(await setCycle(cycle.id, { status: "sending" }, ["eligible"]))) {
    return { step: "send", weekStart: cycle.week_start, status: "sending", detail: "verrou détenu par une autre exécution" }
  }

  const sent: NewsletterLocale[] = []
  for (const l of LOCALES) {
    const ed = byLocale[l]!
    const key = `${cycle.week_start}:${l}`
    const name = `BIB newsletter ${cycle.week_start} ${l.toUpperCase()}`
    const { data: existing } = await admin.from("send_runs").select("*").eq("idempotency_key", key).maybeSingle()
    if ((existing as { status?: string } | null)?.status === "sent") {
      sent.push(l)
      continue
    }
    // Aucune NOUVELLE campagne hors créneau (la seconde langue ne part pas
    // après 09:59 : envoi partiel signalé plutôt qu'envoi tardif).
    if (sendWindowState(new Date(), cycle.send_slot) !== "open") break
    if (!existing) await admin.from("send_runs").insert({ cycle_id: cycle.id, edition_id: ed.id, locale: l, idempotency_key: key, status: "pending" })
    try {
      // Réconciliation : une campagne de ce nom existe-t-elle déjà ?
      const found = await findCampaignByName(name)
      let campaignId = found?.id ?? null
      if (found && ["sent", "in_process", "queued"].includes(found.status)) {
        await admin.from("send_runs").update({ brevo_campaign_id: campaignId, status: "sent", confirmed_at: new Date().toISOString() }).eq("idempotency_key", key)
        sent.push(l)
        continue
      }
      if (!campaignId) {
        campaignId = await createCampaign({ name, subject: ed.subject, previewText: ed.preheader ?? undefined, htmlContent: ed.html, listId: listIdFor(l), tag: `bib-newsletter-${cycle.week_start}` })
        await admin.from("send_runs").update({ brevo_campaign_id: campaignId, status: "created" }).eq("idempotency_key", key)
      }
      await sendCampaignNow(campaignId)
      await admin.from("send_runs").update({ status: "sent", confirmed_at: new Date().toISOString() }).eq("idempotency_key", key)
      await admin.from("newsletter_editions").update({ status: "sent" }).eq("id", ed.id)
      sent.push(l)
    } catch (e) {
      // Résultat incertain : on ne relance PAS (risque de doublon).
      await admin.from("send_runs").update({ status: "unknown", error: (e as Error).message.slice(0, 500) }).eq("idempotency_key", key)
      break
    }
  }

  if (sent.length === LOCALES.length) {
    await setCycle(cycle.id, { status: "sent" })
    await recordIncident({ kind: "newsletter.sent", severity: "info", cycleId: cycle.id, message: `Édition ${cycle.week_start} envoyée en FR et EN.` })
    return { step: "send", weekStart: cycle.week_start, status: "sent" }
  }
  const status = sent.length ? "partially_sent" : "failed"
  await setCycle(cycle.id, { status })
  await recordIncident({
    kind: `newsletter.${status}`,
    severity: "critical",
    cycleId: cycle.id,
    message: sent.length
      ? `Envoi partiel : ${sent.join(", ")} envoyé(s), l'autre langue a échoué. Les e-mails délivrés ne sont pas rappelables ; aucun renvoi automatique.`
      : "Aucun envoi confirmé par Brevo. Vérifier manuellement l'état des campagnes avant toute action.",
  })
  return { step: "send", weekStart: cycle.week_start, status }
}
