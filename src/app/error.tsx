"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1>Une erreur est survenue</h1>
      <button onClick={reset}>Réessayer</button>
    </div>
  )
}