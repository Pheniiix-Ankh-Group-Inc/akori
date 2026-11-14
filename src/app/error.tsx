"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="ed-wrap ed-stack" style={{ minHeight: "100svh", justifyContent: "center", alignItems: "flex-start", gap: "1.25rem" }}>
      <h1 className="ed-h1">Une erreur est survenue</h1>
      <button type="button" onClick={reset} className="ed-btn ed-btn-dark">Réessayer</button>
    </main>
  )
}
