import "server-only"
import { redirect } from "next/navigation"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/env"

export type EditorRole = "editor" | "admin"

export interface Editor {
  id: string
  email: string | null
  role: EditorRole
}

/**
 * Identité de l'opérateur courant, vérifiée côté serveur :
 *   1. jeton validé par Supabase Auth (getUser, pas seulement le cookie) ;
 *   2. habilitation active lue dans public.editors (RPC current_editor_role).
 * Les métadonnées utilisateur modifiables ne sont jamais utilisées.
 */
export const getEditor = cache(async (): Promise<Editor | null> => {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: role, error: roleError } = await supabase.rpc("current_editor_role")
  if (roleError || (role !== "editor" && role !== "admin")) return null

  return { id: user.id, email: user.email ?? null, role }
})

/** À appeler en tête de chaque page et action d'administration. */
export async function requireEditor(): Promise<Editor> {
  const editor = await getEditor()
  if (!editor) redirect("/login?error=forbidden")
  return editor
}

export async function requireAdmin(): Promise<Editor> {
  const editor = await requireEditor()
  if (editor.role !== "admin") redirect("/admin?error=admin_only")
  return editor
}
