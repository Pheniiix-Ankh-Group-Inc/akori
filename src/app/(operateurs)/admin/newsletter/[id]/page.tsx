import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { draftSchema, type EditionDraft } from "@/lib/newsletter/compose"
import { RUBRICS, emptyDraft, itemsOf, type HumanItem } from "@/lib/newsletter/human"
import { cycleInputs } from "@/lib/newsletter/orchestrator"
import type { EditionInputs } from "@/lib/newsletter/inputs"
import { readModes } from "@/lib/admin/automation"
import { utcIsoToZonedLocal } from "@/lib/time"
import { Notice } from "@/components/admin/Notice"
import { approveAction, cancelAction, regenerateAction, rejectAction, saveEditionAction, scheduleAction, sendNowAction } from "../actions"

export const metadata: Metadata = { title: "Newsletter — édition" }

type Edition = { id: string; locale: "fr" | "en"; version: number; status: string; subject: string; html: string; content: unknown; created_at: string; origin: string; edited_by: string | null }
type Check = { edition_id: string; check_key: string; blocking: boolean; passed: boolean }
type SendRun = { locale: string; status: string; requested_at: string; confirmed_at: string | null; error: string | null }

const fmt = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(iso)) : "—")
const EDITABLE = ["collecting", "drafting", "drafted", "blocked", "eligible"]

function optionsFor(key: string, inputs: EditionInputs | null): { id: string; label: string }[] {
  if (!inputs) return []
  if (key === "blockchain_news") return inputs.news.map((n) => ({ id: n.id, label: `${n.title} — ${n.sourceName}` }))
  if (key === "bib_events") return inputs.events.map((e) => ({ id: e.id, label: `${e.title.fr ?? e.title.en ?? e.id} — ${fmt(e.startsAt)}` }))
  return inputs.stories.map((s) => ({ id: s.id, label: s.title.fr ?? s.title.en ?? s.id }))
}

/**
 * Éditeur d'une édition FR/EN : textes, éléments par rubrique (ajout,
 * retrait, ordre), aperçus, contrôles, approbation, planification, envoi,
 * historique. Chaque enregistrement crée une version immuable et repasse
 * les contrôles automatiques.
 */
export default async function NewsletterCyclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const query = await searchParams
  const isAdmin = editor.role === "admin"
  const supabase = await createClient()
  const { data: cData } = await supabase.from("newsletter_cycles").select("*").eq("id", id).maybeSingle()
  if (!cData) notFound()
  const cycle = cData as { id: string; week_start: string; status: string; send_slot: string; scheduled_for: string | null; approved_at: string | null; origin: string; cancelled_reason: string | null }

  const [{ data: eData }, { data: runData }, modes] = await Promise.all([
    supabase.from("newsletter_editions").select("id, locale, version, status, subject, html, content, created_at, origin, edited_by").eq("cycle_id", id).order("version", { ascending: false }).limit(40),
    supabase.from("send_runs").select("locale, status, requested_at, confirmed_at, error").eq("cycle_id", id),
    readModes(supabase),
  ])
  const editions = (eData ?? []) as Edition[]
  const latestVersion = editions[0]?.version
  const latest = editions.filter((e) => e.version === latestVersion)
  const fr = latest.find((e) => e.locale === "fr")
  const en = latest.find((e) => e.locale === "en")
  const parsed = draftSchema.safeParse({ fr: fr?.content, en: en?.content })
  const draft: EditionDraft = parsed.success ? parsed.data : emptyDraft()
  const { data: checkData } = latest.length
    ? await supabase.from("edition_checks").select("edition_id, check_key, blocking, passed").in("edition_id", latest.map((e) => e.id))
    : { data: [] }
  const failedChecks = ((checkData ?? []) as Check[]).filter((c) => c.blocking && !c.passed)
  const editable = EDITABLE.includes(cycle.status)

  let inputs: EditionInputs | null = null
  let inputsError: string | null = null
  if (editable && isSupabaseAdminConfigured()) {
    try {
      inputs = await cycleInputs(cycle.id)
    } catch (e) {
      inputsError = (e as Error).message
    }
  }
  const versions = [...new Set(editions.map((e) => e.version))]
  const runs = (runData ?? []) as SendRun[]
  const slot = cycle.scheduled_for ?? cycle.send_slot

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/newsletter">Newsletter</Link> › Semaine du {cycle.week_start}</p>
          <h1>Édition du {cycle.week_start}</h1>
          <p className="adm-muted">
            Statut : <strong>{cycle.status}</strong> · origine {cycle.origin === "manual" ? "équipe" : "IA"} · envoi prévu {fmt(slot)}
            {cycle.scheduled_for ? " (planifié)" : " (créneau standard)"} · mode {modes.newsletter}
            {cycle.approved_at ? ` · approuvée le ${fmt(cycle.approved_at)}` : ""}
          </p>
          {cycle.cancelled_reason && <p className="adm-muted">Motif : {cycle.cancelled_reason}</p>}
        </div>
      </div>
      <Notice params={query} />
      {modes.newsletter === "review" && cycle.status === "eligible" && !cycle.approved_at && (
        <p className="adm-notice">Mode revue : cette édition ne partira que si un administrateur l&apos;approuve avant le créneau.</p>
      )}

      {editable && (
        <section className="adm-panel" aria-labelledby="h-actions">
          <h2 id="h-actions">Décisions</h2>
          <div className="adm-row" style={{ gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <form action={regenerateAction}>
              <input type="hidden" name="cycle_id" value={cycle.id} />
              <button className="adm-btn" type="submit" disabled={modes.newsletter === "paused"}>Régénérer avec l&apos;IA</button>
            </form>
            {isAdmin && cycle.status === "eligible" && (
              <form action={approveAction}>
                <input type="hidden" name="cycle_id" value={cycle.id} />
                <button className="adm-btn adm-btn-primary" type="submit" disabled={!!cycle.approved_at}>{cycle.approved_at ? "Approuvée" : "Approuver"}</button>
              </form>
            )}
            {isAdmin && (
              <form action={rejectAction} className="adm-row" style={{ gap: "0.5rem" }}>
                <input type="hidden" name="cycle_id" value={cycle.id} />
                <input name="reason" className="adm-input" placeholder="Motif du rejet" required maxLength={300} aria-label="Motif du rejet" style={{ width: "14rem" }} />
                <button className="adm-btn adm-btn-danger" type="submit">Rejeter</button>
              </form>
            )}
          </div>
          {isAdmin && (
            <div className="adm-row" style={{ gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginTop: "1rem" }}>
              <form action={scheduleAction} className="adm-row" style={{ gap: "0.5rem" }}>
                <input type="hidden" name="cycle_id" value={cycle.id} />
                <label htmlFor="slot_local" className="adm-muted">Planifier (heure de Toronto)</label>
                <input id="slot_local" name="slot_local" type="datetime-local" className="adm-input" style={{ width: "auto" }} defaultValue={cycle.scheduled_for ? utcIsoToZonedLocal(cycle.scheduled_for, "America/Toronto") : ""} />
                <button className="adm-btn" type="submit">Enregistrer le créneau</button>
              </form>
              {cycle.status === "eligible" && (
                <form action={sendNowAction} className="adm-row" style={{ gap: "0.5rem" }}>
                  <input type="hidden" name="cycle_id" value={cycle.id} />
                  <input name="confirm" className="adm-input" placeholder="Saisir ENVOYER" aria-label="Confirmation d'envoi" style={{ width: "10rem" }} autoComplete="off" />
                  <button className="adm-btn adm-btn-primary" type="submit" disabled={modes.newsletter === "paused"}>Envoyer maintenant</button>
                </form>
              )}
              <form action={cancelAction} className="adm-row" style={{ gap: "0.5rem" }}>
                <input type="hidden" name="cycle_id" value={cycle.id} />
                <input name="reason" className="adm-input" placeholder="Motif d'annulation" maxLength={300} aria-label="Motif d'annulation" style={{ width: "12rem" }} />
                <button className="adm-btn adm-btn-danger" type="submit">Annuler la semaine</button>
              </form>
            </div>
          )}
          <p className="adm-muted" style={{ marginBottom: 0 }}>L&apos;envoi manuel ne dépend pas de l&apos;envoi automatique (FEATURE_NEWSLETTER_AUTOSEND) : il exige la paire FR/EN validée par les contrôles, Brevo configuré, l&apos;approbation en mode revue et la confirmation « ENVOYER ». L&apos;envoi automatique du mercredi exige en plus FEATURE_NEWSLETTER_AUTOSEND. Une clé d&apos;idempotence par langue empêche tout double envoi.</p>
        </section>
      )}

      {failedChecks.length > 0 && (
        <div className="adm-notice adm-notice-error" role="status">
          Contrôles bloquants en échec (version {latestVersion}) : {[...new Set(failedChecks.map((c) => c.check_key))].join(", ")}
        </div>
      )}

      {latest.length === 2 && (
        <section aria-labelledby="h-preview" style={{ marginBottom: "2rem" }}>
          <h2 id="h-preview" className="adm-section-title">Aperçu — version {latestVersion}</h2>
          <div className="adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            {[fr, en].map((e) => e && (
              <div key={e.id}>
                <p className="adm-muted">{e.locale.toUpperCase()} · {e.subject} · {e.status}</p>
                <iframe title={`Aperçu ${e.locale.toUpperCase()}`} srcDoc={e.html} sandbox="" className="adm-preview" />
              </div>
            ))}
          </div>
        </section>
      )}

      {editable && (
        <form action={saveEditionAction} className="adm-form" aria-labelledby="h-edit">
          <h2 id="h-edit" className="adm-section-title">Modifier l&apos;édition</h2>
          <input type="hidden" name="cycle_id" value={cycle.id} />
          {inputsError && <p className="adm-notice adm-notice-error">Éléments disponibles illisibles : {inputsError}</p>}
          <fieldset className="adm-fieldset">
            <legend>En-tête et Blockchain Insights</legend>
            {(["fr", "en"] as const).map((l) => (
              <div key={l} className="adm-stack-col" style={{ display: "contents" }}>
                <div className="adm-field">
                  <label htmlFor={`subject_${l}`}>Objet {l.toUpperCase()}</label>
                  <input id={`subject_${l}`} name={`subject_${l}`} className="adm-input" required minLength={5} maxLength={120} defaultValue={draft[l].subject} />
                </div>
                <div className="adm-field">
                  <label htmlFor={`preheader_${l}`}>Pré-en-tête {l.toUpperCase()}</label>
                  <input id={`preheader_${l}`} name={`preheader_${l}`} className="adm-input" maxLength={200} defaultValue={draft[l].preheader} />
                </div>
              </div>
            ))}
            {(["fr", "en"] as const).map((l) => (
              <div key={`i-${l}`} className="adm-field">
                <label htmlFor={`intro_${l}`}>Introduction {l.toUpperCase()}</label>
                <textarea id={`intro_${l}`} name={`intro_${l}`} maxLength={600} rows={3} defaultValue={draft[l].intro} />
              </div>
            ))}
            {(["fr", "en"] as const).map((l) => (
              <div key={`b-${l}`} className="adm-field">
                <label htmlFor={`insights_${l}`}>Blockchain Insights {l.toUpperCase()}</label>
                <textarea id={`insights_${l}`} name={`insights_${l}`} maxLength={900} defaultValue={draft[l].blockchain_insights.text} />
                <small>Chiffres State of BIB uniquement par marqueur : {inputs?.facts.map((f) => `{{fact:${f.key}}}`).join(" ") ?? "{{fact:clé}}"}</small>
              </div>
            ))}
          </fieldset>

          {RUBRICS.map((r) => {
            const items: HumanItem[] = itemsOf(parsed.success ? draft : null, r.key)
            const options = optionsFor(r.key, inputs)
            const label = (itemId: string) => options.find((o) => o.id === itemId)?.label ?? `${itemId} (plus disponible cette semaine)`
            const free = options.filter((o) => !items.some((i) => i.id === o.id))
            return (
              <fieldset key={r.key} className="adm-fieldset">
                <legend>{r.label} ({items.length}/{r.max})</legend>
                <input type="hidden" name={`${r.key}_n`} value={items.length} />
                {items.length === 0 && <p className="adm-muted adm-full">Aucun élément.</p>}
                {items.map((it, i) => (
                  <div key={it.id} className="adm-full adm-panel" style={{ marginBottom: 0, display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    <input type="hidden" name={`${r.key}_id_${i}`} value={it.id} />
                    <p className="adm-full" style={{ margin: 0 }}><strong>{label(it.id)}</strong></p>
                    <div className="adm-field">
                      <label htmlFor={`${r.key}_fr_${i}`}>Texte FR</label>
                      <textarea id={`${r.key}_fr_${i}`} name={`${r.key}_fr_${i}`} maxLength={400} rows={3} defaultValue={it.blurb.fr} />
                    </div>
                    <div className="adm-field">
                      <label htmlFor={`${r.key}_en_${i}`}>Texte EN</label>
                      <textarea id={`${r.key}_en_${i}`} name={`${r.key}_en_${i}`} maxLength={400} rows={3} defaultValue={it.blurb.en} />
                    </div>
                    <div className="adm-field">
                      <label htmlFor={`${r.key}_pos_${i}`}>Position</label>
                      <input id={`${r.key}_pos_${i}`} name={`${r.key}_pos_${i}`} type="number" min={1} max={20} className="adm-input" defaultValue={i + 1} />
                    </div>
                    <div className="adm-field" style={{ justifyContent: "flex-end" }}>
                      <label><input type="checkbox" name={`${r.key}_rm_${i}`} /> Retirer cet élément</label>
                    </div>
                  </div>
                ))}
                {items.length < r.max && (
                  <div className="adm-full" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    <div className="adm-field adm-full">
                      <label htmlFor={`${r.key}_id_new`}>Ajouter un élément disponible</label>
                      <select id={`${r.key}_id_new`} name={`${r.key}_id_new`} defaultValue="">
                        <option value="">—</option>
                        {free.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      {!inputs && <small>Liste indisponible (clé de service Supabase requise).</small>}
                    </div>
                    <div className="adm-field">
                      <label htmlFor={`${r.key}_fr_new`}>Texte FR du nouvel élément</label>
                      <textarea id={`${r.key}_fr_new`} name={`${r.key}_fr_new`} maxLength={400} rows={2} />
                    </div>
                    <div className="adm-field">
                      <label htmlFor={`${r.key}_en_new`}>Texte EN du nouvel élément</label>
                      <textarea id={`${r.key}_en_new`} name={`${r.key}_en_new`} maxLength={400} rows={2} />
                    </div>
                  </div>
                )}
              </fieldset>
            )
          })}
          <div className="adm-actions">
            <button className="adm-btn adm-btn-primary" type="submit">Enregistrer une nouvelle version et contrôler</button>
          </div>
        </form>
      )}

      <h2 className="adm-section-title" style={{ marginTop: "2rem" }}>Historique des versions</h2>
      {versions.length === 0 ? (
        <p className="adm-muted">Aucune version.</p>
      ) : (
        <table className="adm-table" style={{ marginBottom: "2rem" }}>
          <thead><tr><th scope="col">Version</th><th scope="col">Créée</th><th scope="col">Origine</th><th scope="col">FR</th><th scope="col">EN</th></tr></thead>
          <tbody>
            {versions.map((v) => {
              const pair = editions.filter((e) => e.version === v)
              const f = pair.find((e) => e.locale === "fr")
              const e2 = pair.find((e) => e.locale === "en")
              return (
                <tr key={v}>
                  <td>v{v}</td>
                  <td>{fmt(pair[0]?.created_at)}</td>
                  <td>{pair[0]?.origin === "human" ? `équipe${pair[0].edited_by === editor.id ? " (vous)" : ""}` : "IA"}</td>
                  <td>{f ? `${f.status} · ${f.subject}` : "—"}</td>
                  <td>{e2 ? `${e2.status} · ${e2.subject}` : "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h2 className="adm-section-title">Envois</h2>
      {runs.length === 0 ? (
        <p className="adm-muted">Aucun envoi tenté.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th scope="col">Langue</th><th scope="col">Statut</th><th scope="col">Demandé</th><th scope="col">Confirmé</th><th scope="col">Erreur</th></tr></thead>
          <tbody>
            {runs.map((r) => <tr key={r.locale}><td>{r.locale.toUpperCase()}</td><td>{r.status}</td><td>{fmt(r.requested_at)}</td><td>{fmt(r.confirmed_at)}</td><td>{r.error ?? "—"}</td></tr>)}
          </tbody>
        </table>
      )}
    </>
  )
}
