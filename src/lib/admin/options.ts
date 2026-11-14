import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { MediaOption } from "@/components/admin/EventForm"

/** Événements BIB pour les sélecteurs (rétrospectives, témoignages). */
export async function listEventOptions(): Promise<MediaOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("events")
    .select("id, slug, starts_at, event_translations(locale, title)")
    .order("starts_at", { ascending: false })
    .limit(300)
  return ((data ?? []) as { id: string; slug: string; starts_at: string; event_translations: { locale: string; title: string }[] }[]).map((e) => ({
    id: e.id,
    label: `${e.starts_at.slice(0, 10)} · ${e.event_translations.find((t) => t.locale === "fr")?.title ?? e.event_translations[0]?.title ?? e.slug}`,
  }))
}

export async function listStoryOptions(): Promise<MediaOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("stories")
    .select("id, slug, story_translations(locale, title)")
    .order("created_at", { ascending: false })
    .limit(300)
  return ((data ?? []) as { id: string; slug: string; story_translations: { locale: string; title: string }[] }[]).map((s) => ({
    id: s.id,
    label: s.story_translations.find((t) => t.locale === "fr")?.title ?? s.story_translations[0]?.title ?? s.slug,
  }))
}
