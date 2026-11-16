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
 * Mode « newsletter » (automation_settings) :
 *   auto   → cycle ci-dessus, sans approbation ;
 *   review → l'envoi exige une approbation admin postérieure à la paire validée ;
 *   paused → ni génération IA ni envoi (l'édition humaine reste possible).
 * Édition humaine (/admin/newsletter) : création d'un cycle, modification des
 * textes et des éléments, mêmes contrôles automatiques que l'IA, planification.
 * Idempotent : verrou par statut, clé d'idempotence par langue, réconciliation
 * avec Brevo — aucun double envoi possible.
 */

const LOCALES: NewsletterLocale[] = ["fr", "en"]

export interface Cycle {
  id: string
  week_start: string
  send_slot: string
  status: string
  regen_attempts: number
  updated_at?: string
  origin?: "auto" | "manual"
  approved_at?: string | null
  scheduled_for?: string | null
}

export type NewsletterMode = "auto" | "review" | "paused"

/** Créneau effectif : planification humaine sinon mercredi 09:00 (Toronto). */
export const slotOf = (cycle: Pick<Cycle, "send_slot" | "scheduled_for">) => cycle.scheduled_for ?? cycle.send_slot

export async function newsletterMode(): Promise<NewsletterMode> {
  const { data } = await getAdminClient().from("automation_settings").select("mode").eq("module", "newsletter").maybeSingle()
  const m = (data as { mode?: string } | null)?.mode
  return m === "auto" || m === "paused" ? m : "review"
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
async function produceAndStore(cycle: Cycle, inputs: EditionInputs, draft: EditionDraft, aiRunId: string | null, editedBy: string | null = null) {
  const admin = getAdminClient()
  const checks = runAllChecks(draft, inputs, slotOf(cycle))
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
        origin: editedBy ? "human" : "ai",
        edited_by: editedBy,
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
  if ((await newsletterMode()) === "paused") return { step: "generate", weekStart: cycle.week_start, status: cycle.status, detail: "module en pause" }
  if (cycle.origin === "manual") return { step: "generate", weekStart: cycle.week_start, status: cycle.status, detail: "cycle édité par l'équipe" }
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
    const inputs = await gatherInputs(slotOf(cycle))
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
  if ((await newsletterMode()) === "paused") return { step: "check", weekStart: cycle.week_start, status: cycle.status, detail: "module en pause" }
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
    let inputs = await gatherInputs(slotOf(cycle))
    const previous = await latestPair(cycle.id)
    // Recontrôle de la dernière paire : elle est réenregistrée comme NOUVELLE
    // version immuable, et c'est cette version-là qui pourra être validée.
    let stored = previous
      ? await produceAndStore(cycle, inputs, previous.draft, null)
      : { failed: [{ key: "missing_edition", blocking: true, passed: false, details: {} }] as CheckResult[], version: 0, editionIds: [] as string[] }

    // Un cycle édité par l'équipe n'est jamais réécrit par l'IA.
    while (stored.failed.length && cycle.origin !== "manual" && attempts < env.newsletter.maxRegenerations && isAiConfigured()) {
      attempts += 1
      await setCycle(cycle.id, { regen_attempts: attempts })
      inputs = await gatherInputs(slotOf(cycle))
      const { value, runId } = await draftEdition(inputs, budget, stored.failed.map((f) => `${f.key}: ${JSON.stringify(f.details).slice(0, 200)}`))
      stored = await produceAndStore(cycle, inputs, value, runId)
    }

    if (stored.failed.length || stored.editionIds.length !== LOCALES.length) {
      await block(cycle, `Édition non éligible après ${attempts} régénération(s).`, { failed: stored.failed.map((f) => f.key) })
      return { step: "check", weekStart: cycle.week_start, status: "blocked", detail: stored.failed.map((f) => f.key).join(", ") }
    }
    await validatePair(cycle.id, stored.editionIds)
    // Nouvelle paire validée : toute approbation antérieure devient caduque.
    await setCycle(cycle.id, { status: "eligible", cancelled_reason: null, approved_at: null, approved_by: null })
    return { step: "check", weekStart: cycle.week_start, status: "eligible" }
  } catch (e) {
    const reason = e instanceof AiBudgetError || e instanceof AiDisabledError ? (e as Error).message : `Contrôle impossible : ${(e as Error).message}`
    await block(cycle, reason)
    return { step: "check", weekStart: cycle.week_start, status: "blocked", detail: reason }
  }
}

export async function cancel(cycle: Cycle, reason: string) {
  await setCycle(cycle.id, { status: "cancelled", cancelled_reason: reason }, ["collecting", "drafting", "drafted", "checking", "blocked", "eligible"])
  await getAdminClient().from("newsletter_editions").update({ status: "cancelled" }).eq("cycle_id", cycle.id).neq("status", "sent")
  await recordIncident({ kind: "newsletter.cancelled", severity: "warning", cycleId: cycle.id, message: `Édition de la semaine du ${cycle.week_start} annulée : ${reason}. Aucun rattrapage ; reprise la semaine suivante.` })
}

/** Mercredi 09:00 (Toronto) : envoi des deux langues ou annulation. */
/** Refus d'un envoi MANUEL : l'édition reste intacte (jamais annulée par un défaut de configuration). */
export class ManualSendError extends Error {}

/**
 * Envoi de la paire validée.
 *  · planifié (cron) : exige FEATURE_NEWSLETTER_AUTOSEND, la fenêtre du créneau
 *    et — en mode revue — l'approbation ; un refus annule la semaine
 *    (stratégie explicite de non-rattrapage).
 *  · manuel (`manual: true`, administrateur) : INDÉPENDANT de l'envoi
 *    automatique et de la fenêtre ; mêmes contrôles de contenu, de mode, de
 *    configuration Brevo et d'idempotence. Un refus lève ManualSendError et
 *    laisse l'édition telle quelle.
 */
export async function runSend(now = new Date(), opts: { cycle?: Cycle; manual?: boolean } = {}): Promise<StepResult> {
  const manual = opts.manual === true
  const cycle = opts.cycle ?? (await getOrCreateCycle(now))
  const slot = manual ? now.toISOString() : slotOf(cycle)
  const window = manual ? "open" : sendWindowState(now, slot)
  const windowOpen = () => manual || sendWindowState(new Date(), slot) === "open"
  /** Refus : annulation de la semaine (planifié) ou erreur sans effet (manuel). */
  const refuse = async (reason: string, detail?: string): Promise<StepResult> => {
    if (manual) throw new ManualSendError(reason)
    await cancel(cycle, reason)
    return { step: "send", weekStart: cycle.week_start, status: "cancelled", detail }
  }
  if (cycle.status === "sending" && isStaleSending(cycle, now)) {
    // Exécution interrompue pendant l'envoi : résultat incertain. Aucun
    // renvoi automatique ; on fige l'état et on alerte.
    if (await setCycle(cycle.id, { status: "failed", cancelled_reason: "envoi interrompu : résultat incertain, vérification manuelle requise" }, ["sending"])) {
      await recordIncident({ kind: "newsletter.stuck_sending", severity: "critical", cycleId: cycle.id, message: "Envoi interrompu : vérifier l'état des campagnes dans Brevo. Aucun renvoi automatique." })
    }
    return { step: "send", weekStart: cycle.week_start, status: "failed", detail: "envoi interrompu" }
  }
  if (["sent", "partially_sent", "cancelled", "sending", "failed"].includes(cycle.status)) {
    if (manual) throw new ManualSendError(`édition déjà traitée (statut ${cycle.status}) : aucun nouvel envoi`)
    return { step: "send", weekStart: cycle.week_start, status: cycle.status, detail: "déjà traité" }
  }
  const mode = await newsletterMode()
  if (mode === "paused") {
    if (manual) throw new ManualSendError("module newsletter en pause : aucun envoi")
    return { step: "send", weekStart: cycle.week_start, status: cycle.status, detail: "module en pause : aucun envoi" }
  }
  if (window === "before") return { step: "send", weekStart: cycle.week_start, status: cycle.status, detail: "créneau non atteint" }
  if (window === "closed") {
    await cancel(cycle, cycle.scheduled_for ? "créneau planifié dépassé" : "créneau du mercredi 09:00 dépassé")
    return { step: "send", weekStart: cycle.week_start, status: "cancelled", detail: "créneau dépassé" }
  }
  // L'envoi AUTONOME exige FEATURE_NEWSLETTER_AUTOSEND ; l'envoi manuel non.
  if (!manual && !env.flags.newsletterAutosend) return refuse("envoi automatique désactivé (FEATURE_NEWSLETTER_AUTOSEND)", "autosend_disabled")
  if (!isBrevoConfigured()) return refuse("Brevo non configuré (clé, expéditeur ou listes FR/EN manquants)", "brevo_not_configured")
  if (cycle.status !== "eligible") return refuse(`édition non éligible (statut ${cycle.status})`)

  // La paire envoyée est EXACTEMENT la paire validée (même version).
  const admin = getAdminClient()
  const { data: validated } = await admin
    .from("newsletter_editions")
    .select("id, locale, version, subject, preheader, html, content, created_at")
    .eq("cycle_id", cycle.id)
    .eq("status", "validated")
  const rows = (validated ?? []) as { id: string; locale: NewsletterLocale; version: number; subject: string; preheader: string | null; html: string; content: unknown; created_at?: string }[]
  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, rows.find((r) => r.locale === l)]))
  const parsedPair = draftSchema.safeParse({ fr: byLocale.fr?.content, en: byLocale.en?.content })
  // Mode revue : approbation admin explicite, postérieure à la paire validée.
  if (mode === "review") {
    const approvedAt = Date.parse(cycle.approved_at ?? "")
    const validatedAt = Math.max(...rows.map((r) => Date.parse(r.created_at ?? "") || 0))
    if (!Number.isFinite(approvedAt) || approvedAt < validatedAt) {
      return refuse(manual ? "mode revue : l'édition doit d'abord être approuvée" : "mode revue : édition non approuvée par un administrateur avant le créneau", "non approuvée")
    }
  }
  if (rows.length !== LOCALES.length || !byLocale.fr || !byLocale.en || byLocale.fr.version !== byLocale.en.version || !parsedPair.success) {
    return refuse("paire validée introuvable ou incohérente")
  }

  // Dernier contrôle bloquant sur cette même paire (dates, éléments…).
  const inputs = await gatherInputs(slot)
  const final = runAllChecks(parsedPair.data, inputs, slot)
  const finalFailed = failedChecks([...final.fr, ...final.en, ...final.pair])
  if (finalFailed.length) return refuse(`contrôle final en échec : ${finalFailed.map((f) => f.key).join(", ")}`)

  // La fenêtre est revérifiée juste avant le verrou : les contrôles qui
  // précèdent peuvent avoir pris du temps (aucun envoi planifié après 09:59).
  if (!windowOpen()) {
    await cancel(cycle, "créneau d'envoi dépassé pendant les contrôles finaux")
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
    if (!windowOpen()) break
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

// ── Édition humaine (/admin/newsletter) ────────────────────────────────────

async function loadCycle(id: string): Promise<Cycle> {
  const { data } = await getAdminClient().from("newsletter_cycles").select("*").eq("id", id).maybeSingle()
  if (!data) throw new Error("Cycle introuvable.")
  return data as Cycle
}

const EDITABLE = ["collecting", "drafting", "drafted", "blocked", "eligible"]

/** Crée (ou reprend) le cycle d'une semaine, piloté par l'équipe. */
export async function createManualCycle(weekStart: string, editorId: string): Promise<Cycle> {
  const admin = getAdminClient()
  const { data: existing } = await admin.from("newsletter_cycles").select("*").eq("week_start", weekStart).maybeSingle()
  if (existing) {
    const c = existing as Cycle
    if (!EDITABLE.includes(c.status)) throw new Error(`Le cycle de cette semaine est « ${c.status} » : il n'est plus modifiable.`)
    await setCycle(c.id, { origin: "manual" })
    return { ...c, origin: "manual" }
  }
  const { data, error } = await admin
    .from("newsletter_cycles")
    .insert({ week_start: weekStart, send_slot: sendSlotFor(weekStart), status: "collecting", origin: "manual", created_by: editorId })
    .select("*")
    .single()
  if (error || !data) throw new Error("Création du cycle impossible.")
  return data as Cycle
}

/** Éléments disponibles pour la semaine (choix proposés à l'équipe). */
export async function cycleInputs(cycleId: string): Promise<EditionInputs> {
  return gatherInputs(slotOf(await loadCycle(cycleId)))
}

/**
 * Enregistre une paire FR/EN rédigée ou corrigée par l'équipe : nouvelle
 * version immuable, mêmes contrôles bloquants que l'IA ; si tout passe, la
 * paire est validée (et toute approbation antérieure annulée).
 */
export async function saveHumanPair(cycleId: string, draft: EditionDraft, editorId: string): Promise<{ failed: CheckResult[]; version: number }> {
  const cycle = await loadCycle(cycleId)
  if (!EDITABLE.includes(cycle.status)) throw new Error(`Cycle « ${cycle.status} » : modification impossible.`)
  const parsed = draftSchema.safeParse(draft)
  if (!parsed.success) throw new Error(`Édition invalide : ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).slice(0, 4).join(" ; ")}`)
  const inputs = await gatherInputs(slotOf(cycle))
  await setCycle(cycle.id, { origin: "manual" })
  const stored = await produceAndStore(cycle, inputs, parsed.data, null, editorId)
  if (stored.failed.length) {
    await setCycle(cycle.id, { status: "blocked", cancelled_reason: `Contrôles en échec : ${stored.failed.map((f) => f.key).join(", ")}`, approved_at: null, approved_by: null })
  } else {
    await validatePair(cycle.id, stored.editionIds)
    await setCycle(cycle.id, { status: "eligible", cancelled_reason: null, approved_at: null, approved_by: null })
  }
  return { failed: stored.failed, version: stored.version }
}

/** Régénération IA à la demande (remplace la paire courante par une nouvelle version). */
export async function regenerateCycle(cycleId: string): Promise<{ failed: CheckResult[] }> {
  if (!isAiConfigured()) throw new Error("Moteur IA non configuré.")
  const cycle = await loadCycle(cycleId)
  if (!EDITABLE.includes(cycle.status)) throw new Error(`Cycle « ${cycle.status} » : régénération impossible.`)
  const inputs = await gatherInputs(slotOf(cycle))
  const { value, runId } = await draftEdition(inputs, newBudget())
  await setCycle(cycle.id, { origin: "auto" })
  const stored = await produceAndStore({ ...cycle, origin: "auto" }, inputs, value, runId)
  if (stored.failed.length) {
    await setCycle(cycle.id, { status: "blocked", cancelled_reason: `Contrôles en échec : ${stored.failed.map((f) => f.key).join(", ")}`, approved_at: null, approved_by: null })
  } else {
    await validatePair(cycle.id, stored.editionIds)
    await setCycle(cycle.id, { status: "eligible", cancelled_reason: null, approved_at: null, approved_by: null })
  }
  return { failed: stored.failed }
}

/** Approbation admin de la paire validée (requise en mode revue). */
export async function approveCycle(cycleId: string, adminId: string): Promise<void> {
  const cycle = await loadCycle(cycleId)
  if (cycle.status !== "eligible") throw new Error("Seule une édition validée par les contrôles peut être approuvée.")
  if (!(await setCycle(cycle.id, { approved_at: new Date().toISOString(), approved_by: adminId }, ["eligible"]))) throw new Error("Approbation impossible (statut modifié entre-temps).")
}

/** Rejet : la paire n'est plus envoyable tant qu'elle n'est pas corrigée. */
export async function rejectCycle(cycleId: string, reason: string): Promise<void> {
  const cycle = await loadCycle(cycleId)
  if (!EDITABLE.includes(cycle.status)) throw new Error(`Cycle « ${cycle.status} » : rejet impossible.`)
  await setCycle(cycle.id, { status: "blocked", cancelled_reason: `Rejetée : ${reason}`, approved_at: null, approved_by: null }, EDITABLE)
  await getAdminClient().from("newsletter_editions").update({ status: "blocked" }).eq("cycle_id", cycle.id).eq("status", "validated")
}

/** Planification d'un créneau (dans la semaine du cycle, dans le futur). */
export async function scheduleCycle(cycleId: string, slotIso: string | null, now = new Date()): Promise<void> {
  const cycle = await loadCycle(cycleId)
  if (!EDITABLE.includes(cycle.status)) throw new Error(`Cycle « ${cycle.status} » : planification impossible.`)
  if (slotIso !== null) {
    const t = Date.parse(slotIso)
    const weekStartUtc = Date.parse(`${cycle.week_start}T00:00:00Z`)
    if (!Number.isFinite(t) || t <= now.getTime()) throw new Error("Le créneau doit être dans le futur.")
    if (t < weekStartUtc || t > weekStartUtc + 8 * 86400000) throw new Error("Le créneau doit se situer dans la semaine du cycle.")
  }
  await setCycle(cycle.id, { scheduled_for: slotIso })
}

/** Annulation humaine de l'édition de la semaine. */
export async function cancelCycle(cycleId: string, reason: string): Promise<void> {
  const cycle = await loadCycle(cycleId)
  if (!EDITABLE.includes(cycle.status)) throw new Error(`Cycle « ${cycle.status} » : annulation impossible.`)
  await cancel(cycle, `annulée par l'équipe — ${reason}`)
}

/**
 * Envoi manuel demandé par un administrateur (après confirmation explicite
 * dans l'interface). Indépendant de FEATURE_NEWSLETTER_AUTOSEND et du créneau
 * du mercredi ; soumis au mode (pause : refus ; revue : approbation requise),
 * aux contrôles de contenu, à la configuration Brevo, au verrou de statut et
 * à la clé d'idempotence par langue. Un refus lève ManualSendError sans
 * modifier l'édition.
 */
export async function sendCycleNow(cycleId: string): Promise<StepResult> {
  const cycle = await loadCycle(cycleId)
  if (cycle.status !== "eligible") throw new ManualSendError("Seule une édition validée par les contrôles peut être envoyée.")
  return runSend(new Date(), { cycle, manual: true })
}
