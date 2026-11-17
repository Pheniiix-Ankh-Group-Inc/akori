import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
import { eventTiming } from "@/lib/events/temporal"
import type { EventRecord } from "@/lib/events/types"
import { Notice, RunBadge, StatusBadge } from "@/components/admin/Notice"
import { syncLumaNowAction, uploadLumaIcsAction } from "./actions"

export const metadata: Metadata = { title: "Événements" }

const TIMING_LABEL = { upcoming: "À venir", ongoing: "En cours", past: "Terminé" } as const
const TRIGGER_LABEL: Record<string, string> = { schedule: "Planifiée", manual: "Manuelle", upload: "Import .ics" }
const PAGE_SIZE = 50

type Run = {
  id: string
  trigger: string
  status: string
  started_at: string
  finished_at: string | null
  feed_host: string | null
  feed_events: number
  created_count: number
  updated_count: number
  unchanged_count: number
  cancelled_count: number
  missing_count: number
  restored_count: number
  earliest_start: string | null
  latest_start: string | null
  warnings: string[] | null
  error: string | null
}

type Row = Pick<EventRecord, "id" | "slug" | "status" | "starts_at" | "ends_at" | "time_zone" | "luma_url" | "event_translations"> & {
  source: string
  source_title: string | null
  source_status: string | null
  missing_since: string | null
  last_synced_at: string | null
}

type Props = { searchParams: Promise<Record<string, string | undefined>> }

const fmt = (iso: string | null, tz = "America/Toronto") =>
  iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(new Date(iso)) : "—"

/**
 * Événements : tableau de bord de la synchronisation Luma → Supabase.
 * Luma est la source de vérité ; l'équipe consulte les données importées,
 * déclenche une synchronisation et gère uniquement les compléments BIB.
 */
export default async function AdminEventsPage({ searchParams }: Props) {
  const editor = await requireEditor()
  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)
  const filter = params.filtre ?? "tous"
  const supabase = await createClient()

  let q = supabase
    .from("events")
    .select("id, slug, status, starts_at, ends_at, time_zone, luma_url, source, source_title, source_status, missing_since, last_synced_at, event_translations(locale, title)", { count: "exact" })
    .order("starts_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (filter === "annules") q = q.eq("source_status", "cancelled")
  if (filter === "absents") q = q.not("missing_since", "is", null)
  if (filter === "manuels") q = q.eq("source", "manual")

  const [{ data, error, count }, { data: runsData }] = await Promise.all([
    q,
    supabase
      .from("event_sync_runs")
      .select("id, trigger, status, started_at, finished_at, feed_host, feed_events, created_count, updated_count, unchanged_count, cancelled_count, missing_count, restored_count, earliest_start, latest_start, warnings, error")
      .order("started_at", { ascending: false })
      .limit(10),
  ])
  const events = (data ?? []) as unknown as Row[]
  const runs = (runsData ?? []) as Run[]
  const last = runs[0]
  const lastOk = runs.find((r) => r.status === "succeeded")
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const isAdmin = editor.role === "admin"
  const canSync = isAdmin && isSupabaseAdminConfigured()
  const href = (p: Record<string, string | number>) => `/admin/evenements?${new URLSearchParams(Object.entries({ filtre: filter, page, ...p }).map(([k, v]) => [k, String(v)]))}`

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Événements</h1>
          <p className="adm-muted">Source de vérité : Luma (calendrier {env.luma.calendarId}). Les fiches sont importées automatiquement ; les compléments éditoriaux BIB se gèrent ici.</p>
        </div>
        {canSync && (
          <div className="adm-actions">
            <form action={syncLumaNowAction}>
              <button className="adm-btn adm-btn-primary" type="submit">Synchroniser maintenant</button>
            </form>
          </div>
        )}
      </div>
      <Notice params={params} />

      <section aria-labelledby="h-sync" className="adm-panel">
        <h2 id="h-sync">Synchronisation Luma</h2>
        <dl className="adm-dl">
          <dt>Synchronisation planifiée</dt>
          <dd>Planifiée toutes les 10 min après activation sur main avec BIB_SCHEDULES_ENABLED=true ; statut réel à vérifier dans GitHub Actions</dd>
          <dt>Flux iCal</dt>
          <dd>{env.luma.icalUrl ? "URL configurée (LUMA_ICAL_URL)" : "URL candidate construite depuis l'identifiant du calendrier — à confirmer par une première synchronisation réussie"}</dd>
          <dt>Dernière exécution</dt>
          <dd>{last ? <>{fmt(last.started_at)} · {TRIGGER_LABEL[last.trigger] ?? last.trigger} · <RunBadge status={last.status} /></> : "Aucune"}</dd>
          <dt>Dernière réussite</dt>
          <dd>{lastOk ? fmt(lastOk.finished_at ?? lastOk.started_at) : "Aucune"}</dd>
          {last?.error && (
            <>
              <dt>Erreur</dt>
              <dd className="adm-error-text">{last.error}</dd>
            </>
          )}
        </dl>
        {!isSupabaseAdminConfigured() && <p className="adm-muted">La clé de service Supabase n&apos;est pas configurée : synchronisation impossible depuis ce déploiement.</p>}
        {canSync && (
          <form action={uploadLumaIcsAction} className="adm-row" style={{ gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <label htmlFor="ics">Importer un export .ics Luma (historique, 10 Mo max)</label>
            <input id="ics" name="ics" type="file" accept=".ics,text/calendar" required />
            <button className="adm-btn" type="submit">Importer</button>
          </form>
        )}
        {!isAdmin && <p className="adm-muted">Le déclenchement manuel est réservé aux administrateurs.</p>}
      </section>

      <section aria-labelledby="h-runs" style={{ marginBottom: "2.5rem" }}>
        <h2 id="h-runs" className="adm-section-title">Journal des synchronisations</h2>
        {runs.length === 0 ? (
          <p className="adm-muted">Aucune synchronisation enregistrée.</p>
        ) : (
          <div className="adm-scroll"><table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Début</th>
                <th scope="col">Type</th>
                <th scope="col">Statut</th>
                <th scope="col">Flux</th>
                <th scope="col">Créés / mis à jour / inchangés</th>
                <th scope="col">Annulés / absents / restaurés</th>
                <th scope="col">Période couverte</th>
                <th scope="col">Avertissements / erreur</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.started_at)}</td>
                  <td>{TRIGGER_LABEL[r.trigger] ?? r.trigger}</td>
                  <td><RunBadge status={r.status} /></td>
                  <td>{r.feed_events} év.{r.feed_host ? <><br /><span className="adm-muted">{r.feed_host}</span></> : null}</td>
                  <td>{r.created_count} / {r.updated_count} / {r.unchanged_count}</td>
                  <td>{r.cancelled_count} / {r.missing_count} / {r.restored_count}</td>
                  <td>{r.earliest_start ? `${fmt(r.earliest_start)} → ${fmt(r.latest_start)}` : "—"}</td>
                  <td>
                    {r.error && <span className="adm-error-text">{r.error}</span>}
                    {(r.warnings ?? []).slice(0, 3).map((w) => <div key={w} className="adm-muted">{w}</div>)}
                    {!r.error && !(r.warnings ?? []).length && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section aria-labelledby="h-list">
        <h2 id="h-list" className="adm-section-title">Événements importés ({count ?? 0})</h2>
        <nav className="adm-row" aria-label="Filtres" style={{ gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[["tous", "Tous"], ["annules", "Annulés"], ["absents", "Absents du flux"], ["manuels", "Saisies historiques"]].map(([k, label]) => (
            <Link key={k} href={href({ filtre: k, page: 1 })} className="adm-btn" aria-current={filter === k ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        {error && <p className="adm-notice adm-notice-error">Lecture impossible ({error.code}).</p>}
        {events.length === 0 ? (
          <p className="adm-muted">Aucun événement pour ce filtre. Lancez une synchronisation pour importer le calendrier Luma.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Titre</th>
                <th scope="col">Date (fuseau de l&apos;événement)</th>
                <th scope="col">Moment</th>
                <th scope="col">Source</th>
                <th scope="col">Statut site</th>
                <th scope="col">Dernière synchro</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const title = e.event_translations.find((t) => t.locale === "fr")?.title ?? e.source_title ?? e.event_translations[0]?.title ?? e.slug
                return (
                  <tr key={e.id}>
                    <td><Link href={`/admin/evenements/${e.id}`}>{title}</Link></td>
                    <td>
                      {fmt(e.starts_at, e.time_zone)}
                      <br />
                      <span className="adm-muted">{e.time_zone}</span>
                    </td>
                    <td>{TIMING_LABEL[eventTiming(e)]}</td>
                    <td>
                      {e.source === "luma" ? "Luma" : "Saisie historique"}
                      {e.source_status === "cancelled" && <><br /><strong>Annulé dans Luma</strong></>}
                      {e.missing_since && <><br /><span className="adm-muted">Absent du flux depuis {fmt(e.missing_since)}</span></>}
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{fmt(e.last_synced_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <nav className="adm-row" aria-label="Pagination" style={{ gap: "1rem", marginTop: "1rem" }}>
            {page > 1 && <Link href={href({ page: page - 1 })} className="adm-btn">← Précédent</Link>}
            <span className="adm-muted">Page {page} sur {pages}</span>
            {page < pages && <Link href={href({ page: page + 1 })} className="adm-btn">Suivant →</Link>}
          </nav>
        )}
      </section>
    </>
  )
}
