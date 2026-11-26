import Link from "next/link"

export default function NotFound() {
  return (
    <main className="ed-wrap ed-stack" style={{ minHeight: "100svh", maxWidth: "none", padding: "0 clamp(1.25rem, 5vw, 7.5rem)", justifyContent: "center", alignItems: "flex-start", gap: "1.5rem" }}>
      <p className="ed-eyebrow">404</p>
      <h1 className="ed-h1" style={{ fontWeight: 360, fontSize: "clamp(3rem, 8vw, 9rem)", lineHeight: 0.95, letterSpacing: "-0.035em" }}>Page introuvable</h1>
      <p className="ed-lede">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="ed-btn ed-btn-dark">Retour à l&apos;accueil</Link>
    </main>
  )
}
