import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { EVENT_COLUMNS, type EventRecord } from "@/lib/events/types"
import { eventTiming } from "@/lib/events/temporal"
import { utcIsoToZonedLocal } from "@/lib/time"
import { EventForm } from "@/components/admin/EventForm"
import { EventEditorialForm } from "@/components/admin/EventEditorialForm"
import { Notice, StatusBadge } from "@/components/admin/Notice"
import { listMediaOptions } from "@/lib/admin/queries"
import { archiveEventAction, deleteEventAction, publishEventAction, unpublishEventAction } from "../actions"

export const metadata: Metadata = { title: "Modifier un événement" }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function EditEventPage({ params, searchParams }: Props) {
  await requireEditor()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const query = await searchParams

  const supabase = await createClient()
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle()
  if (!data) notFound()
  const event = data as unknown as EventRecord
  const mediaOptions = await listMediaOptions()
  const { data: linkedStories } = await supabase
    .from("stories")
    .select("id, slug, status, story_translations(locale, title)")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
  const stories = (linkedStories ?? []) as { id: string; slug: string; status: string; story_translations: { locale: string; title: string }[] }[]

  const translations = Object.fromEntries(
    event.event_translations.map((t) => [t.locale, { title: t.title, summary: t.summary ?? "", description: t.description ?? "" }]),
  )
  const timing = eventTiming(event)
  const isLuma = event.source === "luma"
  const fmt = (iso: string | null | undefined) =>
    iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "full", timeStyle: "short", timeZone: event.time_zone }).format(new Date(iso)) : "—"

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/evenements">Événements</Link> › Modifier</p>
          <h1>{translations.fr?.title || event.source_title || translations.en?.title || event.slug}</h1>
          <p className="adm-muted">
            <StatusBadge status={event.status} /> · {timing === "upcoming" ? "À venir" : timing === "ongoing" ? "En cours" : "Terminé"} (calculé depuis les dates)
          </p>
        </div>
        <div className="adm-actions">
          <Link href={`/admin/apercu/evenements/${event.id}`} className="adm-btn">Aperçu</Link>
          {event.status !== "published" && (
            <form action={publishEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <button className="adm-btn adm-btn-primary" type="submit">Publier</button>
            </form>
          )}
          {event.status === "published" && (
            <form action={unpublishEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <button className="adm-btn" type="submit">Retirer du site</button>
            </form>
          )}
          {event.status !== "archived" && (
            <form action={archiveEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <button className="adm-btn" type="submit">Archiver</button>
            </form>
          )}
          {event.status !== "published" && !isLuma && (
            <form action={deleteEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <button className="adm-btn adm-btn-danger" type="submit">Supprimer</button>
            </form>
          )}
        </div>
      </div>
      <Notice params={query} />
      <section className="adm-panel" aria-labelledby="h-stories">
        <h2 id="h-stories">Rétrospectives liées</h2>
        {stories.length === 0 ? (
          <p className="adm-muted" style={{ marginTop: 0 }}>Aucune rétrospective n&apos;est encore associée à cet événement.</p>
        ) : (
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.2rem" }}>
            {stories.map((st) => (
              <li key={st.id}>
                <Link href={`/admin/en-action/${st.id}`}>{st.story_translations.find((t) => t.locale === "fr")?.title ?? st.story_translations[0]?.title ?? st.slug}</Link>{" "}
                <span className="adm-muted">({st.status})</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/admin/en-action/nouveau?event=${event.id}`} className="adm-btn">Créer une rétrospective pour cet événement</Link>
      </section>

      {isLuma ? (
        <>
          <section className="adm-panel" aria-labelledby="h-luma">
            <h2 id="h-luma">Données Luma (lecture seule)</h2>
            <p className="adm-muted" style={{ marginTop: 0 }}>Ces champs sont mis à jour par la synchronisation ; pour les modifier, éditez l&apos;événement dans Luma.</p>
            <dl className="adm-dl">
              <dt>Titre Luma</dt><dd>{event.source_title ?? "—"}</dd>
              <dt>Début</dt><dd>{fmt(event.starts_at)} <span className="adm-muted">({event.time_zone})</span></dd>
              <dt>Fin</dt><dd>{fmt(event.ends_at)}</dd>
              <dt>Lieu</dt><dd>{event.source_location ?? "—"}</dd>
              <dt>Format</dt><dd>{event.mode === "online" ? "En ligne" : event.mode === "hybrid" ? "Hybride" : "Présentiel"}</dd>
              <dt>Lien Luma</dt><dd>{event.luma_url ? <a href={event.luma_url} target="_blank" rel="noopener noreferrer">{event.luma_url}</a> : "—"}</dd>
              <dt>Statut Luma</dt><dd>{event.source_status === "cancelled" ? <strong className="adm-error-text">Annulé</strong> : event.source_status ?? "—"}</dd>
              <dt>Absent du flux</dt><dd>{event.missing_since ? `depuis ${fmt(event.missing_since)}` : "Non"}</dd>
              <dt>Description Luma</dt><dd style={{ whiteSpace: "pre-line" }}>{event.source_description ? event.source_description.slice(0, 1200) : "—"}</dd>
            </dl>
          </section>
          <EventEditorialForm
            id={event.id}
            updatedAt={event.updated_at}
            coverMediaId={event.cover_media_id ?? ""}
            translations={translations}
            mediaOptions={mediaOptions}
          />
        </>
      ) : (
        <>
          <p className="adm-notice">Fiche historique saisie avant la synchronisation Luma. Les nouveaux événements se créent dans Luma.</p>
      <EventForm
          mediaOptions={mediaOptions}
          values={{
            id: event.id,
            updated_at: event.updated_at,
            slug: event.slug,
            time_zone: event.time_zone,
            starts_local: utcIsoToZonedLocal(event.starts_at, event.time_zone),
            ends_local: event.ends_at ? utcIsoToZonedLocal(event.ends_at, event.time_zone) : "",
            mode: event.mode,
            venue_name: event.venue_name ?? "",
            address: event.address ?? "",
            city: event.city ?? "",
            country_code: event.country_code ?? "",
            online_url: event.online_url ?? "",
            luma_url: event.luma_url ?? "",
            cover_media_id: event.cover_media_id ?? "",
            translations,
          }}
        />
        </>
      )}
    </>
  )
}
