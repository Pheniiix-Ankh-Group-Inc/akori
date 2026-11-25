import { TrackView } from "@/components/analytics/TrackView"
import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { env, isAiConfigured, isBrevoConfigured, isSupabaseAdminConfigured } from "@/lib/env"
import { isSobAvailable, loadSobState } from "@/lib/sob/load"
import { SOB_STALE_DAYS, sobFreshness } from "@/lib/sob/freshness"

export const metadata: Metadata = { title: "Tableau de bord" }

async function count(table: string, filter?: [string, string]) {
  const supabase = await createClient()
  let q = supabase.from(table).select("*", { count: "exact", head: true })
  if (filter) q = q.eq(filter[0], filter[1])
  const { count: n } = await q
  return n ?? 0
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const params = await searchParams
  const [eventsPub, eventsAll, storiesPub, storiesAll, media, pending] = await Promise.all([
    count("events", ["status", "published"]),
    count("events"),
    count("stories", ["status", "published"]),
    count("stories"),
    count("media_assets"),
    count("media_assets", ["rights_status", "pending"]),
  ])

  const sob = await loadSobState()
  const freshness = isSobAvailable(sob) ? sobFreshness(sob.headline.snapshot_date) : null

  const services: [string, boolean][] = [
    ["Clé serveur Supabase (publication des médias, traitements)", isSupabaseAdminConfigured()],
    ["Brevo (newsletter)", isBrevoConfigured()],
    ["Moteur IA", isAiConfigured()],
    ["Lecture State of BIB depuis Supabase", env.flags.sobReadFromSupabase],
  ]

  return (
    <>
      <TrackView event="dashboard_view" props={{ section: "home" }} />
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration BIB</p>
          <h1>Bonjour</h1>
          <p className="adm-muted">Connecté en tant que {editor.role === "admin" ? "administrateur" : "éditeur"}.</p>
        </div>
      </div>
      {params.error === "admin_only" && <p className="adm-notice adm-notice-error">Action réservée aux administrateurs.</p>}
      {!isSobAvailable(sob) && (
        <p className="adm-notice adm-notice-error" role="status">
          State of BIB : aucune version valide à afficher ({sob.reason}). Le site public montre un état d&apos;indisponibilité.{" "}
          <Link href="/admin/state-of-bib">Voir les versions</Link>
        </p>
      )}
      {isSobAvailable(sob) && freshness?.stale && (
        <p className="adm-notice adm-notice-error" role="status">
          State of BIB : l&apos;instantané publié date du {sob.headline.snapshot_date}
          {freshness.ageDays !== null ? ` (${freshness.ageDays} jours)` : ""}, au-delà du seuil de {SOB_STALE_DAYS} jours.
          Une nouvelle version de la source doit être vérifiée puis proposée (voir docs/OPERATIONS_RUNBOOK.md).
        </p>
      )}
      <div className="dash-grid" style={{ flexWrap: "wrap", marginBottom: "2rem" }}>
        <Link href="/admin/evenements" className="dash-card" style={{ padding: "1.25rem", color: "var(--blanc)" }}>
          <p className="dash-card-title">Événements</p>
          <p>{eventsPub} publiés · {eventsAll} au total</p>
        </Link>
        <Link href="/admin/en-action" className="dash-card" style={{ padding: "1.25rem", color: "var(--blanc)" }}>
          <p className="dash-card-title">BIB en action</p>
          <p>{storiesPub} publiées · {storiesAll} au total</p>
        </Link>
        <Link href="/admin/medias" className="dash-card" style={{ padding: "1.25rem", color: "var(--blanc)" }}>
          <p className="dash-card-title">Médias</p>
          <p>{media} importés · {pending} droits en attente</p>
        </Link>
      </div>
      <h2 className="heading-sm">Services</h2>
      <table className="adm-table">
        <tbody>
          {services.map(([label, on]) => (
            <tr key={label}><td>{label}</td><td>{on ? "Configuré" : "Non configuré / désactivé"}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
