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

  const translations = Object.fromEntries(
    event.event_translations.map((t) => [t.locale, { title: t.title, summary: t.summary ?? "", description: t.description ?? "" }]),
  )
  const timing = eventTiming(event)

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/evenements">Événements</Link> › Modifier</p>
          <h1>{translations.fr?.title || translations.en?.title || event.slug}</h1>
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
          {event.status !== "published" && (
            <form action={deleteEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <button className="adm-btn adm-btn-danger" type="submit">Supprimer</button>
            </form>
          )}
        </div>
      </div>
      <Notice params={query} />
      <EventForm
        mediaOptions={mediaOptions}
        values={{
          id: event.id,
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
  )
}
