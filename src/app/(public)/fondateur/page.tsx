import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Fondateurs — AnbaChain",
  description: "Découvrez les fondateurs d'AnbaChain.",
}

const founders = [
  {
    name: "Fadjiah Collin‑Mazile",
    slug: "fadjiah",
    role: "Data leader, angel investor & blockchain strategist",
    image: "/fondateur.jpg",
  },
  {
    name: "Fondateur 2",
    slug: "fondateur-2",
    role: "Role à définir",
    image: null,
  },
]

export default function FondateursPage() {
  return (
    <main>
      <section className="section">
        <div className="wrap">
          {/* Header */}
          <Link href="/" className="label" style={{ marginBottom: "2rem", display: "inline-block" }}>
            ← Back to home
          </Link>
          <h1 className="heading-md" style={{ marginBottom: "1rem" }}>
            Fondateurs
          </h1>
          <p className="text-base" style={{ color: "var(--texte-2)", marginBottom: "4rem" }}>
            Les visionnaires derrière AnbaChain.
          </p>

          {/* Founders grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2.5rem",
            }}
          >
            {founders.map((founder) => (
              <Link
                key={founder.slug}
                href={`/fondateur/${founder.slug}`}
                style={{
                  display: "block",
                  background: "var(--bg-card)",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  transition: "border-color 0.3s",
                  textDecoration: "none",
                  color: "inherit",
                }}
                className="founder-card"
              >
                {/* Photo */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3 / 4",
                    background: "var(--bg-2)",
                  }}
                >
                  {founder.image ? (
                    <Image
                      src={founder.image}
                      alt={founder.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--texte)",
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      Photo à venir
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "1.5rem" }}>
                  <h2 className="heading-xs" style={{ marginBottom: "0.5rem" }}>
                    {founder.name}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--texte-2)" }}>
                    {founder.role}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .founder-card:hover {
          border-color: var(--accent) !important;
        }
      `}</style>
    </main>
  )
}
