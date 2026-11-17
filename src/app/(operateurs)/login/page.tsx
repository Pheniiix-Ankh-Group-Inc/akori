import Link from "next/link"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LoginForm } from "./LoginForm"
import { getEditor } from "@/lib/auth/editor"
import { safeAdminNext } from "@/lib/auth/redirect"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/env"
import { signOut } from "./actions"

export const metadata: Metadata = { title: "Connexion opérateur" }

const ERRORS: Record<string, string> = {
  forbidden: "Ce compte n'est pas habilité à l'administration BIB.",
  link: "Le lien de connexion est invalide ou expiré.",
}

type Props = { searchParams: Promise<{ next?: string; error?: string }> }

/**
 * Connexion réservée aux opérateurs habilités (Supabase Auth).
 * Aucun espace membre, aucune inscription publique.
 */
export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams
  // Opérateur déjà connecté et habilité : directement vers l'administration.
  if (await getEditor()) redirect(safeAdminNext(next))
  // Session ouverte sans habilitation : proposer la déconnexion.
  let signedInWithoutRole = false
  if (isSupabaseConfigured()) {
    const { data } = await (await createClient()).auth.getUser()
    signedInWithoutRole = !!data.user
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <span className="logo">Black <em>in</em> Blockchain</span>
        </Link>
        <div className="auth-box">
          <h1 className="auth-title">Espace opérateurs</h1>
          <p className="auth-subtitle">Accès réservé aux personnes habilitées à gérer les contenus BIB.</p>
          {signedInWithoutRole ? (
            <>
              <p className="auth-error" role="alert">{ERRORS.forbidden}</p>
              <form action={signOut}>
                <button type="submit" className="ed-btn ed-btn-dark" style={{ width: "100%" }}>Se déconnecter</button>
              </form>
            </>
          ) : (
            <LoginForm next={next} initialError={error ? ERRORS[error] : undefined} />
          )}
        </div>
      </div>
    </div>
  )
}
