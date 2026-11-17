import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { env, isAiConfigured, isBrevoConfigured } from "@/lib/env"
import { readModes } from "@/lib/admin/automation"
import { ModeSwitch } from "@/components/admin/ModeSwitch"
import { Notice } from "@/components/admin/Notice"
import { createCycleAction } from "./actions"

export const metadata: Metadata = { title: "Newsletter" }

type Cycle = { id: string; week_start: string; status: string; regen_attempts: number; cancelled_reason: string | null; origin: string; approved_at: string | null; scheduled_for: string | null; send_slot: string }

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(iso)) : "—")
type Incident = { id: string; created_at: string; severity: string; kind: string; message: string }

/**
 * Newsletter : mode d'automatisation, cycles hebdomadaires (IA ou équipe),
 * création d'un cycle, accès à l'éditeur de chaque édition.
 */
export default async function NewsletterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const params = await searchParams
  const supabase = await createClient()
  const [{ data: cycles }, { data: incidents }, { data: sources }, modes] = await Promise.all([
    supabase.from("newsletter_cycles").select("id, week_start, status, regen_attempts, cancelled_reason, origin, approved_at, scheduled_for, send_slot").order("week_start", { ascending: false }).limit(20),
    supabase.from("ops_incidents").select("id, created_at, severity, kind, message").order("created_at", { ascending: false }).limit(20),
    supabase.from("news_sources").select("id, name, enabled, last_status, last_fetched_at").order("name"),
    readModes(supabase),
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
          <h1>Newsletter</h1>
          <p className="adm-muted">Cycle FR/EN : brouillons le lundi, contrôles le mardi, envoi le mercredi 9 h (Toronto). Chaque édition reste modifiable par l&apos;équipe.</p>
        </div>
        <div className="adm-actions">
          <Link href="/admin/newsletter/sources" className="adm-btn">Sources d&apos;actualité</Link>
        </div>
        <form action={createCycleAction} className="adm-actions">
          <select name="week" className="adm-input" aria-label="Semaine" style={{ width: "auto" }} defaultValue="current">
            <option value="current">Semaine en cours</option>
            <option value="next">Semaine suivante</option>
          </select>
          <button className="adm-btn adm-btn-primary" type="submit">Créer ou reprendre l&apos;édition</button>
        </form>
      </div>
      <Notice params={params} />
      <div className="adm-kpis">
        <ModeSwitch module="newsletter" mode={modes.newsletter} isAdmin={editor.role === "admin"} back="/admin/newsletter" />
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
        <thead><tr><th scope="col">Semaine (lundi)</th><th scope="col">Statut</th><th scope="col">Origine</th><th scope="col">Envoi prévu</th><th scope="col">Approbation</th><th scope="col">Motif</th></tr></thead>
        <tbody>
          {((cycles ?? []) as Cycle[]).map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/newsletter/${c.id}`}>{c.week_start}</Link></td>
              <td>{c.status}</td>
              <td>{c.origin === "manual" ? "Équipe" : "IA"}</td>
              <td>{fmt(c.scheduled_for ?? c.send_slot)}</td>
              <td>{c.approved_at ? fmt(c.approved_at) : "—"}</td>
              <td>{c.cancelled_reason ?? "—"}</td>
            </tr>
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
