import Link from "next/link"

export default function NotFound() {
  return (
    <main className="ed-wrap ed-stack" style={{ minHeight: "100svh", justifyContent: "center", alignItems: "flex-start", gap: "1.25rem" }}>
      <p className="ed-eyebrow">404</p>
      <h1 className="ed-h1">Page introuvable</h1>
      <p className="ed-lede">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="ed-btn ed-btn-dark">Retour à l&apos;accueil</Link>
    </main>
  )
}
