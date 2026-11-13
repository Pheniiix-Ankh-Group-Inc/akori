import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { EventForm } from "@/components/admin/EventForm"
import { listMediaOptions } from "@/lib/admin/queries"

export const metadata: Metadata = { title: "Nouvel événement" }

export default async function NewEventPage() {
  await requireEditor()
  const mediaOptions = await listMediaOptions()
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/evenements">Événements</Link> › Nouveau</p>
          <h1>Nouvel événement</h1>
        </div>
      </div>
      <p className="adm-muted" style={{ marginBottom: "1.5rem" }}>
        La fiche est créée en brouillon : elle n&apos;apparaît sur le site qu&apos;après publication.
      </p>
      <EventForm
        mediaOptions={mediaOptions}
        values={{
          slug: "",
          time_zone: "America/Toronto",
          starts_local: "",
          ends_local: "",
          mode: "in_person",
          venue_name: "",
          address: "",
          city: "",
          country_code: "",
          online_url: "",
          luma_url: "",
          cover_media_id: "",
          translations: {},
        }}
      />
    </>
  )
}
