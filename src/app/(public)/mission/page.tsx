import Link from "next/link"

export const metadata = {
  title: "Terms of Use — AnbaChain",
  description: "Terms of use for the AnbaChain platform.",
}

export default function TermsPage() {
  return (
    <main style={{ paddingTop: "" }}>
      <section className="section">
        <div className="wrap-sm">

          {/* Header */}
          <div style={{ marginBottom: "4rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label" >
              ← Back to home
            </Link>
            <h1 className="heading-md">Mission</h1>
            <p className="text-xs" style={{ marginTop: "1rem" }}>
              Last updated: March 12, 2026
            </p>
          </div>

          {/* Content */}
 

          {/* Footer nav */}
          <div style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--border)", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          </div>

        </div>
      </section>
    </main>
  )
}