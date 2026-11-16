import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { isSobAvailable, loadSobState } from "@/lib/sob/load"
import { SOB_STALE_DAYS, sobFreshness } from "@/lib/sob/freshness"
import { isGithubDispatchConfigured, isSupabaseAdminConfigured } from "@/lib/env"
import { readModes } from "@/lib/admin/automation"
import { ModeSwitch } from "@/components/admin/ModeSwitch"
import { Notice, RunBadge } from "@/components/admin/Notice"
import { approveVersionAction, checkCoherenceAction, rejectVersionAction, restoreVersionAction, runPipelineAction } from "./actions"

export const metadata: Metadata = { title: "State of BIB — versions" }

type Report = {
  passed?: boolean
  strong_variation?: boolean
  reinforced?: { passed: boolean; checks: { name: string; passed: boolean; detail: string }[] }
  checked_at?: string
  schema_errors?: string[]
  consistency_anomalies?: string[]
  divergence?: { previous_version: string | null; threshold: number; strong: string[]; metrics: { metric: string; previous: number; candidate: number; relative_change: number | null }[] }
  provenance?: Record<string, string | number | null>
}

type Version = {
  id: string
  provider_version: string
  as_of_date: string
  status: string
  is_current: boolean
  candidate_at: string | null
  published_at: string | null
  decided_at: string | null
  decision_note: string | null
  validation_report: Report | null
  attempts?: number | null
  last_attempt_at?: string | null
  quarantine_reason?: string | null
  dataset_artifacts: { name: string }[]
}

type RunRow = { id: string; kind: string; status: string; started_at: string; finished_at: string | null; message: string | null }
type Incident = { id: string; created_at: string; kind: string; severity: string; message: string }

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(iso)) : "—")
const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)} %`)

/**
 * State of BIB : versions de données (Supabase, source primaire), rapport de
 * validation, approbation / rejet / restauration, mode d'automatisation.
 */
export default async function AdminSobPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const params = await searchParams
  const isAdmin = editor.role === "admin"
  const supabase = await createClient()
  const [{ data: vData, error }, { data: runData }, modes, snap, { data: incData }] = await Promise.all([
    supabase
      .from("dataset_versions")
      .select("*, dataset_artifacts(name)")
      .eq("source_id", "electric-capital-osdd")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("ingestion_runs").select("id, kind, status, started_at, finished_at, message").order("started_at", { ascending: false }).limit(25),
    readModes(supabase),
    loadSobState(),
    supabase.from("ops_incidents").select("id, created_at, kind, severity, message").like("kind", "sob.%").order("created_at", { ascending: false }).limit(8),
  ])
  const incidents = (incData ?? []) as Incident[]
  const versions = (vData ?? []) as unknown as Version[]
  const runs = (runData ?? []) as RunRow[]
  const lastOf = (kind: string, status?: string) => runs.find((r) => r.kind === kind && (!status || r.status === status))
  const lastCheck = lastOf("version_check")
  const lastReconcile = lastOf("reconcile")
  const freshness = isSobAvailable(snap) ? sobFreshness(snap.headline.snapshot_date) : null
  const duration = (r: RunRow) => (r.finished_at ? `${Math.max(0, Math.round((Date.parse(r.finished_at) - Date.parse(r.started_at)) / 1000))} s` : "—")

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>State of BIB — versions</h1>
          <p className="adm-muted">
            Site public : {!isSobAvailable(snap) ? `état d'indisponibilité affiché (${snap.reason})` : snap.origin === "supabase" ? `version ${snap.version} lue dans Supabase` : `copie technique valide (version ${snap.version}) — Supabase illisible`}.
          </p>
        </div>
      </div>
      <Notice params={params} />
      {modes.sob === "auto" ? (
        <p className="adm-notice adm-notice-ok" role="status">
          Mode automatique : la détection, la validation, la publication et l&apos;actualisation du site se font sans intervention. Cette page sert à surveiller et, exceptionnellement, à intervenir.
        </p>
      ) : (
        <p className="adm-notice" role="status">
          Mode « {modes.sob} » : la publication automatique est suspendue. Le fonctionnement normal du MVP est le mode automatique.
        </p>
      )}

      <section className="adm-panel" aria-labelledby="h-health">
        <h2 id="h-health">Supervision</h2>
        <dl className="adm-dl">
          <dt>Fraîcheur des données</dt>
          <dd>
            {isSobAvailable(snap) && freshness
              ? <>Instantané du {snap.headline.snapshot_date}{freshness.ageDays !== null ? ` (${freshness.ageDays} jours)` : ""}{freshness.stale ? <strong className="adm-error-text"> — au-delà du seuil de {SOB_STALE_DAYS} jours</strong> : " — dans le seuil"}</>
              : "Aucune donnée affichée"}
          </dd>
          <dt>Dernière vérification de la source</dt>
          <dd>{lastCheck ? <>{fmt(lastCheck.started_at)} · <RunBadge status={lastCheck.status} /> · {lastCheck.message ?? ""}</> : "Aucune"}</dd>
          <dt>Dernier traitement réussi</dt>
          <dd>{lastOf("build", "succeeded") ? fmt(lastOf("build", "succeeded")!.started_at) : "Aucun"}</dd>
          <dt>Dernier échec</dt>
          <dd>{runs.find((r) => r.status === "failed") ? <>{fmt(runs.find((r) => r.status === "failed")!.started_at)} · {runs.find((r) => r.status === "failed")!.kind} · {runs.find((r) => r.status === "failed")!.message ?? ""}</> : "Aucun"}</dd>
          <dt>Cohérence base / fichiers</dt>
          <dd>{lastReconcile ? <>{fmt(lastReconcile.started_at)} · <RunBadge status={lastReconcile.status} /> · {lastReconcile.message ?? ""}</> : "Jamais contrôlée"}</dd>
          {!isSobAvailable(snap) && snap.problems.length > 0 && (
            <>
              <dt>Copie de repli refusée</dt>
              <dd className="adm-error-text">{snap.problems.slice(0, 4).join(" ; ")}</dd>
            </>
          )}
        </dl>
        {isAdmin && (
          <div className="adm-row" style={{ gap: "1rem", flexWrap: "wrap", marginTop: "1rem", alignItems: "center" }}>
            <form action={checkCoherenceAction}>
              <button className="adm-btn" type="submit" disabled={!isSupabaseAdminConfigured()}>Vérifier la cohérence base / fichiers</button>
            </form>
            <form action={runPipelineAction} className="adm-row" style={{ gap: "0.6rem" }}>
              <label><input type="checkbox" name="force" /> Forcer la reconstruction</label>
              <button className="adm-btn" type="submit" disabled={!isGithubDispatchConfigured()}>Vérifier la source maintenant</button>
            </form>
          </div>
        )}
        {isAdmin && !isGithubDispatchConfigured() && (
          <p className="adm-muted" style={{ marginBottom: 0 }}>
            Relance depuis l&apos;administration non configurée (GITHUB_DISPATCH_TOKEN). En attendant : GitHub → Actions → « State of BIB — pipeline automatique » → Run workflow.
          </p>
        )}
      </section>

      <section aria-labelledby="h-inc" style={{ marginBottom: "2rem" }}>
        <h2 id="h-inc" className="adm-section-title">Incidents State of BIB</h2>
        {incidents.length === 0 ? (
          <p className="adm-muted">Aucun incident.</p>
        ) : (
          <table className="adm-table">
            <thead><tr><th scope="col">Date</th><th scope="col">Gravité</th><th scope="col">Type</th><th scope="col">Message</th></tr></thead>
            <tbody>{incidents.map((i) => <tr key={i.id}><td>{fmt(i.created_at)}</td><td>{i.severity}</td><td>{i.kind}</td><td>{i.message}</td></tr>)}</tbody>
          </table>
        )}
      </section>
      <div className="adm-kpis">
        <ModeSwitch module="sob" mode={modes.sob} isAdmin={isAdmin} back="/admin/state-of-bib" />
        <ModeSwitch module="sob_insights" mode={modes.sob_insights} isAdmin={isAdmin} back="/admin/state-of-bib" />
      </div>
      {error && <p className="adm-notice adm-notice-error">Lecture impossible ({error.code}).</p>}

      <h2 className="adm-section-title">Versions</h2>
      {versions.length === 0 ? (
        <p className="adm-muted">Aucune version enregistrée. Le pipeline (refresh-data.yml → publish_supabase.py ingest) crée la première candidate.</p>
      ) : (
        versions.map((v) => {
          const r = v.validation_report
          const pending = v.status === "validated" || v.status === "blocked"
          return (
            <section key={v.id} className="adm-panel" aria-label={`Version ${v.provider_version}`}>
              <h2>
                {v.provider_version} <RunBadge status={v.status} /> {v.is_current && <span className="adm-status adm-status-published">Courante</span>}
              </h2>
              <dl className="adm-dl">
                <dt>Date de référence</dt><dd>{v.as_of_date}</dd>
                <dt>Candidate le</dt><dd>{fmt(v.candidate_at)}</dd>
                <dt>Publiée le</dt><dd>{fmt(v.published_at)}</dd>
                <dt>Artefacts</dt><dd>{v.dataset_artifacts.length} fichier(s)</dd>
                {v.decision_note && (<><dt>Note de décision</dt><dd>{v.decision_note}</dd></>)}
                <dt>Validation</dt>
                <dd>
                  {!r ? "Aucun rapport (version antérieure à la V2)" : r.passed ? (r.strong_variation ? "Valide — forte variation confirmée par les contrôles renforcés automatiques" : "Valide") : <span className="adm-error-text">{r.reinforced && !r.reinforced.passed ? "Quarantaine — forte variation non confirmée" : "Bloquante"}</span>}
                  {r?.checked_at && <span className="adm-muted"> · contrôlée le {fmt(r.checked_at)}</span>}
                </dd>
              </dl>
              {r && ((r.schema_errors?.length ?? 0) + (r.consistency_anomalies?.length ?? 0) > 0) && (
                <ul className="adm-report adm-error-text">
                  {[...(r.schema_errors ?? []), ...(r.consistency_anomalies ?? [])].slice(0, 12).map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              {v.status === "blocked" && (
                <p className="adm-muted">
                  Tentatives : {v.attempts ?? 0}{v.last_attempt_at ? ` · dernière le ${fmt(v.last_attempt_at)}` : ""}. La dernière version valide reste en ligne ; une nouvelle tentative
                  automatique a lieu si la source est corrigée, si le pipeline est mis à jour, ou après le délai de reprise.
                  {v.quarantine_reason ? ` Motif : ${v.quarantine_reason}` : ""}
                </p>
              )}
              {r?.reinforced && (
                <ul className="adm-report">
                  {r.reinforced.checks.map((c) => (
                    <li key={c.name} className={c.passed ? undefined : "adm-error-text"}>{c.passed ? "✓" : "✗"} {c.name} — {c.detail}</li>
                  ))}
                </ul>
              )}
              {r?.divergence?.metrics?.length ? (
                <div className="adm-scroll" style={{ marginTop: "1rem" }}>
                  <table className="adm-table">
                    <caption className="adm-muted" style={{ textAlign: "left", padding: "0.5rem 0" }}>Écart avec la version {r.divergence.previous_version} (seuil des contrôles renforcés ±{Math.round(r.divergence.threshold * 100)} %)</caption>
                    <thead><tr><th scope="col">Indicateur</th><th scope="col">Précédente</th><th scope="col">Candidate</th><th scope="col">Variation</th></tr></thead>
                    <tbody>
                      {r.divergence.metrics.map((m) => (
                        <tr key={m.metric}>
                          <td>{m.metric}</td><td>{m.previous.toLocaleString("fr-CA")}</td><td>{m.candidate.toLocaleString("fr-CA")}</td>
                          <td className={r.divergence!.strong.includes(m.metric) ? "adm-error-text" : undefined}>{pct(m.relative_change)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {r?.provenance && (
                <p className="adm-muted" style={{ marginBottom: 0 }}>
                  Provenance : {String(r.provenance.source_id ?? "")} · pipeline {String(r.provenance.pipeline_version ?? "inconnu")}
                  {r.provenance.commit ? ` · commit ${String(r.provenance.commit).slice(0, 12)}` : ""}
                  {r.provenance.workflow_run ? ` · run ${String(r.provenance.workflow_run)}` : ""}
                </p>
              )}
              {isAdmin && (pending || v.status === "superseded") && (
                <div className="adm-row" style={{ gap: "1rem", flexWrap: "wrap", marginTop: "1rem", alignItems: "flex-end" }}>
                  {v.status === "validated" && (
                    <form action={approveVersionAction} className="adm-row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                      <input type="hidden" name="id" value={v.id} />
                      <input name="note" className="adm-input" placeholder="Note (facultative)" maxLength={500} style={{ width: "16rem" }} aria-label="Note de décision" />
                      <button className="adm-btn adm-btn-primary" type="submit" disabled={modes.sob === "paused"}>Approuver et publier</button>
                    </form>
                  )}
                  {pending && (
                    <form action={rejectVersionAction} className="adm-row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                      <input type="hidden" name="id" value={v.id} />
                      <input name="reason" className="adm-input" placeholder="Motif du rejet" required maxLength={500} style={{ width: "16rem" }} aria-label="Motif du rejet" />
                      <button className="adm-btn adm-btn-danger" type="submit">Rejeter</button>
                    </form>
                  )}
                  {v.status === "superseded" && (
                    <form action={restoreVersionAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="adm-btn" type="submit">Restaurer cette version</button>
                    </form>
                  )}
                </div>
              )}
              {isAdmin && v.status === "validated" && modes.sob === "paused" && <p className="adm-muted">Publication impossible tant que le module est en pause.</p>}
            </section>
          )
        })
      )}

      <h2 className="adm-section-title">Dernières exécutions du pipeline</h2>
      {runs.length === 0 ? (
        <p className="adm-muted">Aucune exécution enregistrée.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th scope="col">Début</th><th scope="col">Étape</th><th scope="col">Statut</th><th scope="col">Durée</th><th scope="col">Message</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}><td>{fmt(r.started_at)}</td><td>{r.kind}</td><td><RunBadge status={r.status} /></td><td>{duration(r)}</td><td>{r.message ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
