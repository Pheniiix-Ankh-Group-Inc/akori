"use client"

import { createBrowserClient } from "@supabase/ssr"

/**
 * Client navigateur, utilisé uniquement dans l'administration pour
 * téléverser un fichier vers une URL signée émise par le serveur.
 * Il n'utilise que la clé publiable ; toute écriture reste soumise à RLS.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error("Supabase BIB n'est pas configuré.")
  return createBrowserClient(url, key)
}
