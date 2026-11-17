import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { AUTOMATION_MODULES, readModes } from "@/lib/admin/automation"
import { ModeSwitch } from "@/components/admin/ModeSwitch"
import { Notice, RunBadge } from "@/components/admin/Notice"

export const metadata: Metadata = { title: "Automatisations" }

const fmt = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(iso)) : "—"

type Audit = { id: number; occurred_at: string; action: string; entity_type: string; details: Record<string, unknown> | null; actor_id: string | null }
type Incident = { id: string; created_at: string; kind: string; severity: string; message: string }

/**
 * Tableau de bord central : modes de chaque module, dernières exécutions des
 * pipelines (Luma, State of BIB, newsletter), incidents et journal d'audit.
 */
export default async function AutomationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const params = await searchParams
  const isAdmin = editor.role === "admin"
  const supabase = await createClient()
  const [modes, lumaRun, sobRun, cycle, incidents, audit] = await Promise.all([
    readModes(supabase),
    supabase.from("event_sync_runs").select("status, started_at, error").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("ingestion_runs").select("status, started_at, message, kind").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("newsletter_cycles").select("week_start, status, send_slot, scheduled_for, approved_at").order("week_start", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("ops_incidents").select("id, created_at, kind, severity, message").order("created_at", { ascending: false }).limit(10),
    supabase.from("editorial_audit").select("id, occurred_at, action, entity_type, details, actor_id").order("occurred_at", { ascending: false }).limit(40),
  ])
  const l = lumaRun.data as { status: string; started_at: string; error: string | null } | null
  const s = sobRun.data as { status: string; started_at: string; message: string | null; kind: string } | null
  const c = cycle.data as { week_start: string; status: string; send_slot: string; scheduled_for: string | null; approved_at: string | null } | null

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Automatisations</h1>
          <p className="adm-muted">
            Synchronisation Luma : planification préparée toutes les 10 minutes, uniquement après activation du workflow GitHub sur main avec BIB_SCHEDULES_ENABLED = true. État réel : voir les dernières exécutions.
          </p>
        </div>
      </div>
      <Notice params={params} />

      <h2 className="adm-section-title">Modes de publication</h2>
      <div className="adm-kpis">
        {AUTOMATION_MODULES.map((m) => <ModeSwitch key={m} module={m} mode={modes[m]} isAdmin={isAdmin} back="/admin/automatisations" />)}
      </div>

      <h2 className="adm-section-title">Dernières exécutions</h2>
      <div className="adm-kpis">
        <div className="adm-kpi">
          <strong>Événements (Luma)</strong>
          <span>{l ? <>{fmt(l.started_at)} · <RunBadge status={l.status} /></> : "Aucune synchronisation"}</span>
          {l?.error && <span className="adm-error-text">{l.error}</span>}
          <Link href="/admin/evenements">Ouvrir le tableau de synchronisation</Link>
        </div>
        <div className="adm-kpi">
          <strong>State of BIB</strong>
          <span>{s ? <>{fmt(s.started_at)} · {s.kind} · <RunBadge status={s.status} /></> : "Aucune exécution"}</span>
          {s?.message && <span className="adm-muted">{s.message}</span>}
          <Link href="/admin/state-of-bib">Voir les versions</Link>
        </div>
        <div className="adm-kpi">
          <strong>Newsletter</strong>
          <span>{c ? <>Semaine du {c.week_start} · {c.status}</> : "Aucun cycle"}</span>
          {c && <span className="adm-muted">Envoi prévu : {fmt(c.scheduled_for ?? c.send_slot)}{c.approved_at ? ` · approuvé le ${fmt(c.approved_at)}` : ""}</span>}
          <Link href="/admin/newsletter">Ouvrir la newsletter</Link>
        </div>
      </div>

      <h2 className="adm-section-title">Incidents récents</h2>
      {(incidents.data ?? []).length === 0 ? (
        <p className="adm-muted">Aucun incident enregistré.</p>
      ) : (
        <table className="adm-table" style={{ marginBottom: "2rem" }}>
          <thead><tr><th scope="col">Date</th><th scope="col">Gravité</th><th scope="col">Type</th><th scope="col">Message</th></tr></thead>
          <tbody>
            {((incidents.data ?? []) as Incident[]).map((i) => (
              <tr key={i.id}><td>{fmt(i.created_at)}</td><td>{i.severity}</td><td>{i.kind}</td><td>{i.message}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="adm-section-title">Journal d&apos;audit</h2>
      {(audit.data ?? []).length === 0 ? (
        <p className="adm-muted">Journal vide.</p>
      ) : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead><tr><th scope="col">Date</th><th scope="col">Action</th><th scope="col">Objet</th><th scope="col">Auteur</th><th scope="col">Détails</th></tr></thead>
            <tbody>
              {((audit.data ?? []) as Audit[]).map((a) => (
                <tr key={a.id}>
                  <td>{fmt(a.occurred_at)}</td>
                  <td>{a.action}</td>
                  <td>{a.entity_type}</td>
                  <td>{a.actor_id ? (a.actor_id === editor.id ? "vous" : `${a.actor_id.slice(0, 8)}…`) : "automatisation"}</td>
                  <td className="adm-muted">{a.details && Object.keys(a.details).length ? JSON.stringify(a.details).slice(0, 160) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
