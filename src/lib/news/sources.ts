import "server-only"
import { z } from "zod"
import { getAdminClient } from "@/lib/supabase/admin"
import { validateExternalUrl } from "@/lib/net/ssrf"
import { readFeed, type FeedItem } from "@/lib/news/ingest"

export const REGION_TAGS = ["africa", "caribbean", "diaspora", "global"] as const

export const sourceSchema = z.object({
  name: z.string().trim().min(2).max(200),
  feed_url: z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "Le flux doit être en HTTPS."),
  homepage_url: z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "Le site doit être en HTTPS.").optional().or(z.literal("")),
  kind: z.enum(["rss", "atom"]),
  language: z.enum(["fr", "en", "es", "pt", "other"]),
  region_tags: z.array(z.enum(REGION_TAGS)).max(4),
  // Conditions de réutilisation constatées par la personne qui autorise la
  // source (titre, lien et court résumé uniquement — jamais l'article entier).
  usage_terms: z.string().trim().min(20, "Décrivez les conditions de réutilisation vérifiées (20 caractères minimum).").max(1000),
})
export type SourceInput = z.infer<typeof sourceSchema>

export interface ProbeResult {
  ok: boolean
  items: number
  sample: string[]
  latest: string | null
  error?: string
}

/**
 * Teste un flux AVANT son enregistrement : l'adresse est réellement lue (avec
 * les mêmes protections que la collecte) et doit contenir des articles. Aucune
 * source n'est ajoutée sur la foi d'une URL supposée.
 */
export async function probeFeed(url: string, read: (u: string) => Promise<FeedItem[]> = readFeed): Promise<ProbeResult> {
  if (!validateExternalUrl(url).ok) return { ok: false, items: 0, sample: [], latest: null, error: "Adresse refusée (HTTPS public uniquement)." }
  try {
    const items = await read(url)
    if (!items.length) return { ok: false, items: 0, sample: [], latest: null, error: "Le flux ne contient aucun article lisible." }
    const dates = items.map((i) => i.publishedAt).filter((d): d is string => !!d).sort()
    return { ok: true, items: items.length, sample: items.slice(0, 3).map((i) => i.title), latest: dates.at(-1) ?? null }
  } catch (e) {
    return { ok: false, items: 0, sample: [], latest: null, error: `Flux illisible (${(e as Error).message.slice(0, 120)}).` }
  }
}

/** Ajoute une source testée, désactivée par défaut (l'activation est un acte distinct). */
export async function addSource(input: SourceInput, probe: ProbeResult): Promise<string> {
  if (!probe.ok) throw new Error(probe.error ?? "Flux non vérifié.")
  const { data, error } = await getAdminClient()
    .from("news_sources")
    .insert({
      name: input.name,
      kind: input.kind,
      feed_url: input.feed_url,
      homepage_url: input.homepage_url || null,
      language: input.language,
      region_tags: input.region_tags,
      usage_terms: input.usage_terms,
      enabled: false,
      last_status: `test ok : ${probe.items} article(s)`,
      last_fetched_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) throw new Error(error.code === "23505" ? "Ce flux est déjà enregistré." : "Enregistrement impossible.")
  return (data as { id: string }).id
}

/** Active (avec auteur et date d'autorisation) ou désactive une source. */
export async function setSourceEnabled(id: string, enabled: boolean, authorizedBy: string): Promise<void> {
  const patch = enabled ? { enabled: true, authorized_by: authorizedBy, authorized_at: new Date().toISOString() } : { enabled: false }
  const { error } = await getAdminClient().from("news_sources").update(patch).eq("id", id)
  if (error) throw new Error("Mise à jour impossible.")
}
