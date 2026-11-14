import "server-only"
import { pickLocalized } from "@/lib/content/locales"
import { publicMediaUrl } from "@/lib/supabase/public"
import type { PublicMedia } from "@/lib/events/types"
import type { MediaView } from "@/components/en-action/types"

/** Transforme les médias publics en vues affichables (URL du bucket public). */
export function toPublicMediaViews(media: Record<string, PublicMedia>, locale: string): Record<string, MediaView> {
  const out: Record<string, MediaView> = {}
  for (const m of Object.values(media)) {
    const url = publicMediaUrl(m.public_path)
    if (!url) continue
    out[m.id] = {
      id: m.id,
      kind: m.kind,
      url,
      mime_type: m.mime_type,
      width: m.width,
      height: m.height,
      alt: pickLocalized(m.alt_text, locale),
      credit: m.credit,
      posterUrl: m.poster_media_id ? publicMediaUrl(media[m.poster_media_id]?.public_path) : null,
      subtitlesUrl: m.subtitles_media_id ? publicMediaUrl(media[m.subtitles_media_id]?.public_path) : null,
    }
  }
  return out
}
