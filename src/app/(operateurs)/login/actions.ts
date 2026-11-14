"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { env, isSupabaseConfigured } from "@/lib/env"

export interface LoginState {
  error?: string
  info?: string
}

const passwordSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(200),
  next: z.string().optional(),
})

const linkSchema = z.object({ email: z.email().max(254) })

/** Seules des redirections internes vers /admin sont acceptées. */
function safeNext(next: string | undefined): string {
  return next && /^\/admin(\/[A-Za-z0-9/_-]*)?$/.test(next) ? next : "/admin"
}

const GENERIC_ERROR = "Identifiants invalides ou accès non autorisé."

export async function signInWithPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { error: "L'authentification n'est pas encore configurée sur cet environnement." }
  const parsed = passwordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  })
  if (!parsed.success) return { error: GENERIC_ERROR }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return { error: GENERIC_ERROR }
  redirect(safeNext(parsed.data.next))
}

/**
 * Lien de connexion par e-mail. shouldCreateUser:false : aucun compte n'est
 * jamais créé depuis cette page (pas d'inscription publique).
 * Le message est identique que l'adresse existe ou non.
 */
export async function sendMagicLink(_: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { error: "L'authentification n'est pas encore configurée sur cet environnement." }
  const parsed = linkSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) return { error: "Saisissez une adresse e-mail valide." }

  const supabase = await createClient()
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl}/auth/callback` },
  })
  return { info: "Si cette adresse est habilitée, un lien de connexion vient d'être envoyé." }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect("/login")
}
