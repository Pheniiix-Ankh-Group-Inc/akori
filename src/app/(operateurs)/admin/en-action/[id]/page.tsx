import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { STORY_COLUMNS, type StoryRecord } from "@/lib/stories/types"
import { listMediaOptions } from "@/lib/admin/queries"
import { listEventOptions } from "@/lib/admin/options"
import { createDraftPreviewUrls } from "@/lib/media/preview"
import { StoryForm } from "@/components/admin/StoryForm"
import { Notice, StatusBadge } from "@/components/admin/Notice"
import { archiveStoryAction, deleteStoryAction, publishStoryAction, saveStoryMedia, unpublishStoryAction } from "../actions"

export const metadata: Metadata = { title: "Modifier une rétrospective" }

type MediaRow = { id: string; kind: string; rights_status: string; alt_text: Record<string, string> }

export default async function EditStoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const query = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("stories").select(STORY_COLUMNS).eq("id", id).maybeSingle()
  if (!data) notFound()
  const story = data as unknown as StoryRecord

  const [images, videos, events, mediaRes] = await Promise.all([
    listMediaOptions(["image"]),
    listMediaOptions(["video"]),
    listEventOptions(),
    supabase.from("media_assets").select("id, kind, rights_status, alt_text").in("kind", ["image", "video"]).order("created_at", { ascending: false }).limit(300),
  ])
  const allMedia = (mediaRes.data ?? []) as MediaRow[]
  const previews = await createDraftPreviewUrls(allMedia.filter((m) => m.kind === "image").map((m) => m.id))
  const linked = new Map(story.story_media.map((sm) => [sm.media_id, sm]))
  const ordered = [...allMedia].sort((a, b) => (linked.get(a.id)?.position ?? 9999) - (linked.get(b.id)?.position ?? 9999))
  const translations = Object.fromEntries(
    story.story_translations.map((t) => [t.locale, { title: t.title, summary: t.summary ?? "", body: t.body ?? "", seo: t.seo_description ?? "" }]),
  )

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/en-action">BIB en action</Link> › Modifier</p>
          <h1>{translations.fr?.title || translations.en?.title || story.slug}</h1>
          <p className="adm-muted"><StatusBadge status={story.status} /> · {story.story_media.length} média(s) associé(s)</p>
        </div>
        <div className="adm-actions">
          <Link href={`/admin/apercu/en-action/${story.id}`} className="adm-btn">Aperçu</Link>
          {story.status !== "published" && (
            <form action={publishStoryAction}><input type="hidden" name="id" value={story.id} /><button className="adm-btn adm-btn-primary">Publier</button></form>
          )}
          {story.status === "published" && (
            <form action={unpublishStoryAction}><input type="hidden" name="id" value={story.id} /><button className="adm-btn">Retirer du site</button></form>
          )}
          {story.status !== "archived" && (
            <form action={archiveStoryAction}><input type="hidden" name="id" value={story.id} /><button className="adm-btn">Archiver</button></form>
          )}
          {story.status !== "published" && (
            <form action={deleteStoryAction}><input type="hidden" name="id" value={story.id} /><button className="adm-btn adm-btn-danger">Supprimer</button></form>
          )}
        </div>
      </div>
      <Notice params={query} />

      <StoryForm
        images={images}
        videos={videos}
        events={events}
        values={{
          id: story.id,
          updated_at: story.updated_at,
          slug: story.slug,
          occurred_on: story.occurred_on ?? "",
          event_id: story.event_id ?? "",
          cover_media_id: story.cover_media_id ?? "",
          featured_video_id: story.featured_video_id ?? "",
          translations,
        }}
      />

      <h2 className="heading-sm" style={{ margin: "3rem 0 1rem" }}>Galerie de la rétrospective</h2>
      <p className="adm-muted" style={{ marginBottom: "1rem" }}>
        Cochez les médias à inclure et indiquez leur ordre. Un média sans droits approuvés bloque la publication.
      </p>
      <form action={saveStoryMedia} className="adm-form">
        <input type="hidden" name="story_id" value={story.id} />
        <div className="adm-grid">
          {ordered.map((m) => {
            const link = linked.get(m.id)
            return (
              <div key={m.id} className="adm-media">
                <input type="hidden" name="media_id" value={m.id} />
                {previews[m.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL signée privée
                  <img src={previews[m.id]} alt={m.alt_text?.fr ?? ""} />
                ) : (
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border-h)", borderRadius: 4 }}>{m.kind}</div>
                )}
                <label><input type="checkbox" name={`include_${m.id}`} defaultChecked={!!link} /> Inclure</label>
                <label>Ordre <input type="number" min={0} name={`position_${m.id}`} defaultValue={link?.position ?? 0} className="adm-input" /></label>
                <span className="adm-muted">Droits : {m.rights_status}</span>
                {(["fr", "en", "es"] as const).map((l) => (
                  <label key={l}>
                    Légende {l.toUpperCase()}
                    <input name={`caption_${l}_${m.id}`} maxLength={300} defaultValue={link?.caption?.[l] ?? ""} className="adm-input" />
                  </label>
                ))}
              </div>
            )
          })}
        </div>
        <div className="adm-actions">
          <button className="adm-btn adm-btn-primary" type="submit">Enregistrer la galerie</button>
        </div>
      </form>
    </>
  )
}
