"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="ed-wrap ed-stack" style={{ minHeight: "100svh", maxWidth: "none", padding: "0 clamp(1.25rem, 5vw, 7.5rem)", justifyContent: "center", alignItems: "flex-start", gap: "1.5rem" }}>
      <h1 className="ed-h1" style={{ fontWeight: 360, fontSize: "clamp(3rem, 8vw, 9rem)", lineHeight: 0.95, letterSpacing: "-0.035em" }}>Une erreur est survenue</h1>
      <button type="button" onClick={reset} className="ed-btn ed-btn-dark">Réessayer</button>
    </main>
  )
}
