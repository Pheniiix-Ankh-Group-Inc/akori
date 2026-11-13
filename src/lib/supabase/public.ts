import "server-only"
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { env, isSupabaseConfigured } from "@/lib/env"

let client: SupabaseClient | null = null

/**
 * Client anonyme sans cookies, pour les lectures publiques mises en cache.
 * Il ne voit que ce que les politiques RLS autorisent au rôle `anon`
 * (contenus publiés). Retourne null si Supabase BIB n'est pas configuré :
 * les pages affichent alors un état vide.
 */
export function getPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createSupabaseClient(env.supabase.url!, env.supabase.publishableKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

/** URL publique d'un objet du bucket public des médias. */
export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path || !env.supabase.url) return null
  const safe = path.split("/").map(encodeURIComponent).join("/")
  return `${env.supabase.url}/storage/v1/object/public/bib-media-public/${safe}`
}

/** URL publique d'un snapshot State of BIB. */
export function publicSnapshotUrl(path: string): string | null {
  if (!env.supabase.url) return null
  const safe = path.split("/").map(encodeURIComponent).join("/")
  return `${env.supabase.url}/storage/v1/object/public/bib-sob-snapshots/${safe}`
}
