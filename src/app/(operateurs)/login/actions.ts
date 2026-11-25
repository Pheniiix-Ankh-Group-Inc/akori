"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { env, isSupabaseConfigured } from "@/lib/env"
import { safeAdminNext } from "@/lib/auth/redirect"
import { headers } from "next/headers"
import { trackServerEvent } from "@/lib/analytics-server"

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


const GENERIC_ERROR = "Identifiants invalides ou accès non autorisé."

export async function signInWithPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { error: "L'authentification n'est pas encore configurée sur cet environnement." }
  const parsed = passwordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  })
  if (!parsed.success) {
    await trackServerEvent("login_failure", { method: "password", reason: "invalid_input" }, await headers())
    return { error: GENERIC_ERROR }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  // Jamais l'adresse ni le message d'erreur Supabase : méthode et motif générique seulement.
  if (error) {
    await trackServerEvent("login_failure", { method: "password", reason: "invalid_credentials" }, await headers())
    return { error: GENERIC_ERROR }
  }
  await trackServerEvent("login_success", { method: "password" }, await headers())
  redirect(safeAdminNext(parsed.data.next))
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
