import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Rafraîchit la session Supabase pour les routes opérateurs et renvoie
 * l'utilisateur (vérifié par Supabase Auth). L'autorisation fine
 * (habilitation éditeur) est ensuite vérifiée dans chaque page et action
 * serveur : le proxy n'est qu'une première barrière.
 */
export async function updateOperatorSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  let response = NextResponse.next({ request })
  if (!url || !key) return { response, userId: null as string | null }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { response, userId: user?.id ?? null }
}
