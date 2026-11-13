import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Inscription fermée" }

/**
 * Route historique conservée : BIB n'a pas d'espace membre et l'accès
 * opérateur se fait uniquement sur invitation.
 */
export default function RegisterPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <span className="logo">Black in <em>Blockchain</em></span>
        </Link>
        <div className="auth-box">
          <h1 className="auth-title">Inscription fermée</h1>
          <p className="auth-subtitle">
            Aucun compte n&apos;est nécessaire pour consulter le site ou participer aux événements BIB.
            L&apos;inscription aux événements se fait sur leur page Luma.
          </p>
          <p className="auth-footer">
            <Link href="/">Retour au site</Link> · <Link href="/login">Espace opérateurs</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
