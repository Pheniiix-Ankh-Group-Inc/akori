"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { signIn } from "@/lib/auth-client"

export default function ConnexionPage() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  async function handleGoogle() {
    setLoading(true)
    await signIn.social({ provider: "google", callbackURL: "/dashboard" })
  }

  async function handleEmail() {
    if (!email || !password) return
    setLoading(true)
    setError("")
    const { error } = await signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    })
    if (error) {
      setError(error.message ?? "Erreur de connexion.")
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <Link href="/" style={{ display: "block", marginBottom: "3rem", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700, color: "var(--blanc)" }}>
            Ako<em style={{ fontStyle: "italic", fontWeight: 200, color: "var(--accent)" }}>ri</em>
          </span>
        </Link>

        {/* Card */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "2.5rem", background: "var(--bg-card)" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", fontWeight: 200, color: "var(--blanc)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            Bon retour.
          </h1>
          <p style={{ fontSize: "0.86rem", color: "var(--texte)", marginBottom: "2rem" }}>
            Connectez-vous à votre espace membre.
          </p>

          {/* Boutons sociaux */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--r)", background: "transparent", color: "var(--blanc)", fontSize: "0.86rem", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.2s", opacity: loading ? 0.6 : 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-h)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Chargement..." : "Continuer avec Google"}
            </button>
          </div>

          {/* Séparateur */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--texte)" }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          {/* Formulaire email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--texte)", marginBottom: "0.4rem" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="input-field"
                style={{ width: "100%", borderRadius: "var(--r)" }}
                disabled={loading}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--texte)", marginBottom: "0.4rem" }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ width: "100%", borderRadius: "var(--r)" }}
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              />
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <p style={{ fontSize: "0.78rem", color: "#ef4444", marginBottom: "1rem" }}>
              {error}
            </p>
          )}

          <Button variant="white" onClick={handleEmail} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>

          <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--texte)", marginTop: "1.5rem" }}>
            Pas encore membre ?{" "}
            <Link href="/inscription" style={{ color: "var(--accent)" }}>
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}