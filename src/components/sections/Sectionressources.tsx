"use client";

import { Button } from "@/components/ui/Button"

/**
 * SectionRessources — Section 8
 * Layout magazine : 1 article featured (pleine hauteur) + 2 petits.
 * Grille avec séparateurs style tableau.
 * Identique au #ressources du HTML v3.
 */

const ARTICLES = [
  {
    featured: true,
    cat:    "Rapport · Analyse",
    title:  "La blockchain dans les systèmes de santé africains : état des lieux 2026",
    excerpt:
      "Une analyse approfondie des projets blockchain déployés dans 8 pays africains pour améliorer la traçabilité des médicaments et la gestion des dossiers patients. Co-rédigé par 4 membres AfroChain.",
    author: "[Auteur · Membre AfroChain]",
    date:   "Fév 2026 · 12 min",
  },
  {
    featured: false,
    cat:    "Tutoriel",
    title:  "Déployer votre premier smart contract sur Base",
    excerpt:
      "Guide pas à pas pour développeurs débutants et intermédiaires — de zéro au déploiement.",
    author: "[Membre · Développeur]",
    date:   "Jan 2026 · 8 min",
  },
  {
    featured: false,
    cat:    "Gouvernance",
    title:  "Régulation crypto au Québec : ce que tout entrepreneur doit savoir",
    excerpt:
      "Tour d'horizon des obligations légales pour les startups crypto au Canada en 2026.",
    author: "[Juriste · Membre]",
    date:   "Jan 2026 · 6 min",
  },
]

export function SectionRessources() {
  return (
    <section
      id="ressources"
      style={{ padding: "var(--pad) 0", background: "var(--bg)" }}
    >
      {/* ── Top ── */}
      <div
        style={{
          padding: "0 3rem",
          marginBottom: "5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span
            data-reveal
            style={{
              display: "block",
              fontSize: "0.68rem",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "1.5rem",
            }}
          >
            Savoir
          </span>
          <h2
            data-reveal
            data-delay="1"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 200,
              color: "var(--blanc)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
            }}
          >
            Ressources &{" "}
            <em style={{ fontStyle: "italic", fontWeight: 200 }}>Analyses</em>
          </h2>
        </div>
        <Button variant="ghost" href="#">Toutes les ressources</Button>
      </div>

      {/* ── Grille magazine ── */}
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gridTemplateRows: "1fr 1fr",
          borderTop: "1px solid var(--border)",
          borderLeft: "1px solid var(--border)",
          margin: "0 3rem",
          minHeight: "560px",
        }}
        className="res-grid"
      >
        {ARTICLES.map(({ featured, cat, title, excerpt, author, date }, i) => (
          <div
            key={i}
            style={{
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              padding: "3rem",
              display: "flex",
              flexDirection: "column",
              cursor: "pointer",
              transition: "background 0.3s",
              gridRow: featured ? "1 / 3" : "auto",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--bg-2)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            {/* Catégorie */}
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "1.25rem",
              }}
            >
              {cat}
            </div>

            {/* Titre */}
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                color: "var(--blanc)",
                lineHeight: 1.2,
                marginBottom: "1.25rem",
                fontSize: featured
                  ? "clamp(1.6rem, 2.5vw, 2.2rem)"
                  : "1.1rem",
                flex: featured ? 1 : "none",
              }}
            >
              {title}
            </h3>

            {/* Extrait */}
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--texte)",
                lineHeight: 1.75,
                marginBottom: "1.5rem",
              }}
            >
              {excerpt}
            </p>

            {/* Méta */}
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--texte)",
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--border)",
                marginTop: "auto",
              }}
            >
              <span>{author}</span>
              <span>{date}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .res-grid {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
            margin: 0 1.5rem !important;
          }
          .res-grid > div { grid-row: auto !important; }
        }
      `}</style>
    </section>
  )
}