import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { eventTiming } from "@/lib/events/temporal"
import type { EventRecord } from "@/lib/events/types"
import { Notice, StatusBadge } from "@/components/admin/Notice"

export const metadata: Metadata = { title: "Événements" }

const TIMING_LABEL = { upcoming: "À venir", ongoing: "En cours", past: "Terminé" } as const

type Props = { searchParams: Promise<Record<string, string | undefined>> }

export default async function AdminEventsPage({ searchParams }: Props) {
  await requireEditor()
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, slug, status, starts_at, ends_at, time_zone, luma_url, event_translations(locale, title)")
    .order("starts_at", { ascending: false })
    .limit(500)
  const events = (data ?? []) as unknown as Pick<EventRecord, "id" | "slug" | "status" | "starts_at" | "ends_at" | "time_zone" | "luma_url" | "event_translations">[]

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Événements</h1>
        </div>
        <div className="adm-actions">
          <Link href="/admin/evenements/nouveau" className="adm-btn adm-btn-primary">Nouvel événement</Link>
        </div>
      </div>
      <Notice params={params} />
      {error && <p className="adm-notice adm-notice-error">Lecture impossible ({error.code}).</p>}
      {events.length === 0 ? (
        <p className="adm-muted">Aucun événement enregistré. Les fiches sont saisies manuellement ; aucune donnée n&apos;est importée depuis Luma.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Titre</th>
              <th scope="col">Date (fuseau de l&apos;événement)</th>
              <th scope="col">Moment</th>
              <th scope="col">Statut</th>
              <th scope="col">Luma</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const title = e.event_translations.find((t) => t.locale === "fr")?.title ?? e.event_translations[0]?.title ?? e.slug
              return (
                <tr key={e.id}>
                  <td><Link href={`/admin/evenements/${e.id}`}>{title}</Link></td>
                  <td>
                    {new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: e.time_zone }).format(new Date(e.starts_at))}
                    <br />
                    <span className="adm-muted">{e.time_zone}</span>
                  </td>
                  <td>{TIMING_LABEL[eventTiming(e)]}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td>{e.luma_url ? "Oui" : "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}
