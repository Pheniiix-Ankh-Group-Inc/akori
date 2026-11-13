import Link from "next/link"
import type { Metadata } from "next"
import { LoginForm } from "./LoginForm"

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
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <span className="logo">Black in <em>Blockchain</em></span>
        </Link>
        <div className="auth-box">
          <h1 className="auth-title">Espace opérateurs</h1>
          <p className="auth-subtitle">Accès réservé aux personnes habilitées à gérer les contenus BIB.</p>
          <LoginForm next={next} initialError={error ? ERRORS[error] : undefined} />
        </div>
      </div>
    </div>
  )
}
