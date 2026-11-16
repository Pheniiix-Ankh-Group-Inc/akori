"use client"

import { useActionState } from "react"
import { signInWithPassword, sendMagicLink, type LoginState } from "./actions"

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [pwState, pwAction, pwPending] = useActionState<LoginState, FormData>(signInWithPassword, {
    error: initialError,
  })
  const [linkState, linkAction, linkPending] = useActionState<LoginState, FormData>(sendMagicLink, {})

  return (
    <>
      <form action={pwAction}>
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">E-mail</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required className="auth-input" />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">Mot de passe</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} className="auth-input" />
        </div>
        {pwState.error && <p className="auth-error" role="alert">{pwState.error}</p>}
        <button type="submit" className="auth-social-btn" disabled={pwPending}>
          {pwPending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="auth-divider">
        <div className="auth-divider-line" />
        <span className="auth-divider-text">ou</span>
        <div className="auth-divider-line" />
      </div>

      <form action={linkAction}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="link-email">Recevoir un lien de connexion</label>
          <input id="link-email" name="email" type="email" autoComplete="email" required className="auth-input" />
        </div>
        {linkState.error && <p className="auth-error" role="alert">{linkState.error}</p>}
        {linkState.info && <p className="auth-subtitle" role="status">{linkState.info}</p>}
        <button type="submit" className="auth-social-btn" disabled={linkPending}>
          {linkPending ? "Envoi…" : "Envoyer le lien"}
        </button>
      </form>
    </>
  )
}
