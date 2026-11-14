import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { MediaOption } from "@/components/admin/EventForm"

/** Images importées, pour les sélecteurs de visuel (événements, rétrospectives). */
export async function listMediaOptions(kinds: string[] = ["image"]): Promise<MediaOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("media_assets")
    .select("id, kind, draft_path, rights_status, alt_text")
    .in("kind", kinds)
    .order("created_at", { ascending: false })
    .limit(500)
  return ((data ?? []) as { id: string; kind: string; draft_path: string; rights_status: string; alt_text: Record<string, string> }[]).map((m) => ({
    id: m.id,
    label: `${m.alt_text?.fr || m.alt_text?.en || m.draft_path.split("/").pop()} · ${m.kind} · droits : ${m.rights_status}`,
  }))
}
