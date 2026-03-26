"use client"

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
    social: "https://www.linkedin.com/in/fadjiahcollin/"
  },
  {
    name: "Brice Mimifir",
    slug: "brice",
    role: "Java Developer, Digital Transformation Consultant & Blockchain Developer",
    image: "/images/brice_mimifir.jpg",
    social: "https://www.linkedin.com/in/brice-mimifir"
  },
]

export function SectionEquipe() {
  return (
    <section className="section" id="fondateurs" style={{ padding: "var(--pad) 0" }}>
      <div className="wrap">
        <h1 className="heading-md" style={{ marginBottom: "1rem", color:"var(--accent)" }}>
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
            <div key={founder.slug} style={{ background: "var(--bg-card)", overflow: "hidden" }}>
              
              {/* Image cliquable */}
              <Link href={`/fondateurs/${founder.slug}`} style={{ display: "block" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3 / 4",
                    background: "var(--bg-2)",
                  }}
                >
                  <Image
                    src={founder.image}
                    alt={founder.name}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </Link>

              {/* Info */}
              <div style={{ padding: "1.5rem" }}>
                <h2 className="heading-xs" style={{ marginBottom: "0.5rem", color: "var(--accent)" }}>
                  {founder.name}
                </h2>

                <p className="text-sm" style={{ color: "var(--texte-2)", marginBottom: "1rem" }}>
                  {founder.role}
                </p>

                {/* Liens sociaux */}
                <div className="f-links" style={{ display: "flex", gap: "0.5rem" }}>
                  <a href={founder.social} className="f-link" target="_blank" rel="noopener noreferrer">in</a>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  )
}