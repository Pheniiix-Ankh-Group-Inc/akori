"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { signIn, signUp } from "@/lib/auth-client"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName,  setLastName]  = useState("")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")

  async function handleGoogle() {
    setLoading(true)
    await signIn.social({ provider: "google", callbackURL: "/onboarding" })
  }

  async function handleRegister() {
    if (!firstName || !email || !password) {
      setError("Please fill in all required fields.")
      return
    }
    setLoading(true)
    setError("")
    const { error } = await signUp.email({
      name:        `${firstName} ${lastName}`.trim(),
      email,
      password,
      callbackURL: "/onboarding",
    })
    if (error) {
      setError(error.message ?? "Registration failed.")
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <Link href="/" className="auth-logo">
          <span className="logo">Ako<em>ri</em></span>
        </Link>

        <div className="auth-box">
          <h1 className="auth-title">Join AKORI.</h1>
          <p className="auth-subtitle">Create your member account.</p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="auth-social-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Loading..." : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <div className="auth-divider-line" />
          </div>

          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="auth-field">
              <label className="auth-label">First name <span className="text-accent">*</span></label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="auth-input"
                disabled={loading}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="auth-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email <span className="text-accent">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password <span className="text-accent">*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="auth-input"
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            />
            <p className="text-xs mt-1">Minimum 8 characters</p>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <Button variant="white" onClick={handleRegister}>
            {loading ? "Creating account..." : "Create account"}
          </Button>

          <p className="auth-footer">
            Already a member? <Link href="/login">Sign in</Link>
          </p>

          <p className="auth-footer" style={{ marginTop: "0.5rem", fontSize: "0.72rem" }}>
            By creating an account, you agree to our{" "}
            <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}