import "server-only"
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { env, isSupabaseAdminConfigured } from "@/lib/env"

/**
 * Client « clé secrète » : contourne RLS. Réservé au code serveur, APRÈS
 * contrôle explicite des droits (requireEditor) ou dans les traitements
 * planifiés authentifiés par CRON_SECRET. Ne jamais l'importer dans un
 * composant client ni journaliser la clé.
 */
export function getAdminClient(): SupabaseClient {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("SUPABASE_SECRET_KEY manquante : opération serveur indisponible.")
  }
  return createSupabaseClient(env.supabase.url!, env.supabase.secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
