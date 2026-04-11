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
    image: "/images/fadjiah_collin_mazile.jpg",
  },
  {
    name: "Brice Mimifir",
    slug: "brice",
    role: "Java Developer, Digital Transformation Consultant & Blockchain Developer",
    image: "/images/brice_mimifir.jpg",
    
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
                href={`/fondateurs/${founder.slug}`}
                style={{
                  display: "block",
                  background: "var(--bg-card)",
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
                  <h2 className="heading-xs" style={{ marginBottom: "0.5rem", color:"var(--accent)" }}>
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
