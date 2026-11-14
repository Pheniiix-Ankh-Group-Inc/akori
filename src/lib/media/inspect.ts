import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { sniffMime, type SniffedMime } from "./sniff"

/**
 * Lit uniquement les 64 premiers octets d'un objet privé (requête Range sur
 * une URL signée de 60 s) pour en vérifier la signature, sans télécharger
 * une vidéo entière. Renvoie null si l'objet est illisible.
 */
export async function sniffStoredObject(supabase: SupabaseClient, bucket: string, path: string): Promise<SniffedMime | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60)
  if (error || !data?.signedUrl) return null
  try {
    const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-63" }, signal: AbortSignal.timeout(10_000), cache: "no-store" })
    if (!res.ok && res.status !== 206) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    return sniffMime(buf.subarray(0, 64))
  } catch {
    return null
  }
}
