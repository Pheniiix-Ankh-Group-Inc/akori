import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { EVENT_COLUMNS, type EventRecord } from "@/lib/events/types"
import { EventDetail } from "@/components/events/EventDetail"
import { createDraftPreviewUrl } from "@/lib/media/preview"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }

/**
 * Aperçu privé d'une fiche (brouillon compris). L'image provient d'une URL
 * signée de courte durée : aucun lien public durable vers un brouillon.
 */
export default async function EventPreviewPage({ params, searchParams }: Props) {
  await requireEditor()
  const { id } = await params
  const { lang } = await searchParams
  const locale = lang === "en" || lang === "es" ? lang : "fr"
  if (!z.uuid().safeParse(id).success) notFound()

  const supabase = await createClient()
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle()
  if (!data) notFound()
  const event = data as unknown as EventRecord
  const coverUrl = event.cover_media_id ? await createDraftPreviewUrl(event.cover_media_id) : null

  return (
    <>
      <p className="adm-notice">
        Aperçu privé ({event.status}) ·{" "}
        {(["fr", "en", "es"] as const).map((l) => (
          <Link key={l} href={`?lang=${l}`} style={{ marginRight: "0.75rem" }}>{l.toUpperCase()}</Link>
        ))}
        · <Link href={`/admin/evenements/${event.id}`}>Retour à l&apos;édition</Link>
      </p>
      <EventDetail event={event} locale={locale} coverUrl={coverUrl} cover={null} />
    </>
  )
}
