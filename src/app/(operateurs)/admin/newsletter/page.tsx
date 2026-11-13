import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { env, isAiConfigured, isBrevoConfigured } from "@/lib/env"

export const metadata: Metadata = { title: "Newsletter — suivi" }

type Cycle = { id: string; week_start: string; status: string; regen_attempts: number; cancelled_reason: string | null }
type Incident = { id: string; created_at: string; severity: string; kind: string; message: string }

/**
 * Suivi en lecture seule du cycle autonome (aucune approbation requise).
 * Les envois et annulations sont décidés par les contrôles automatiques.
 */
export default async function NewsletterMonitorPage() {
  await requireEditor()
  const supabase = await createClient()
  const [{ data: cycles }, { data: incidents }, { data: sources }] = await Promise.all([
    supabase.from("newsletter_cycles").select("id, week_start, status, regen_attempts, cancelled_reason").order("week_start", { ascending: false }).limit(12),
    supabase.from("ops_incidents").select("id, created_at, severity, kind, message").order("created_at", { ascending: false }).limit(20),
    supabase.from("news_sources").select("id, name, enabled, last_status, last_fetched_at").order("name"),
  ])

  const flags: [string, boolean][] = [
    ["Inscription (FEATURE_NEWSLETTER_SUBSCRIBE)", env.flags.newsletterSubscribe],
    ["Envoi automatique (FEATURE_NEWSLETTER_AUTOSEND)", env.flags.newsletterAutosend],
    ["Veille actualités (FEATURE_NEWS_INGEST)", env.flags.newsIngest],
    ["Moteur IA configuré", isAiConfigured()],
    ["Brevo configuré", isBrevoConfigured()],
    ["Alertes e-mail (FEATURE_OPS_ALERTS)", env.flags.opsAlerts],
  ]

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Newsletter — suivi</h1>
        </div>
      </div>
      <table className="adm-table" style={{ marginBottom: "2rem" }}>
        <tbody>
          {flags.map(([label, on]) => (
            <tr key={label}><td>{label}</td><td>{on ? "Activé" : "Désactivé"}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="heading-sm">Cycles hebdomadaires</h2>
      <table className="adm-table" style={{ marginBottom: "2rem" }}>
        <thead><tr><th scope="col">Semaine (lundi)</th><th scope="col">Statut</th><th scope="col">Régénérations</th><th scope="col">Motif</th></tr></thead>
        <tbody>
          {((cycles ?? []) as Cycle[]).map((c) => (
            <tr key={c.id}><td>{c.week_start}</td><td>{c.status}</td><td>{c.regen_attempts}</td><td>{c.cancelled_reason ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="heading-sm">Sources d&apos;actualités autorisées</h2>
      <p className="adm-muted">Ajout et autorisation d&apos;une source : procédure SQL documentée dans docs/EDITORIAL_WORKFLOWS.md.</p>
      <table className="adm-table" style={{ marginBottom: "2rem" }}>
        <tbody>
          {((sources ?? []) as { id: string; name: string; enabled: boolean; last_status: string | null; last_fetched_at: string | null }[]).map((s) => (
            <tr key={s.id}><td>{s.name}</td><td>{s.enabled ? "active" : "inactive"}</td><td>{s.last_status ?? "—"}</td><td>{s.last_fetched_at?.slice(0, 16) ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="heading-sm">Incidents récents</h2>
      <table className="adm-table">
        <tbody>
          {((incidents ?? []) as Incident[]).map((i) => (
            <tr key={i.id}><td>{i.created_at.slice(0, 16).replace("T", " ")}</td><td>{i.severity}</td><td>{i.kind}</td><td>{i.message}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
