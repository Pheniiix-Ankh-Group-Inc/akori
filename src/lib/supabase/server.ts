import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { env, isSupabaseConfigured } from "@/lib/env"

/**
 * Client lié à la session de l'utilisateur (cookies) : utilisé pour
 * l'administration. Les politiques RLS s'appliquent avec son identité.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase BIB n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).")
  }
  const cookieStore = await cookies()

  return createServerClient(env.supabase.url!, env.supabase.publishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Appel depuis un Server Component : le proxy rafraîchit la session.
        }
      },
    },
  })
}
