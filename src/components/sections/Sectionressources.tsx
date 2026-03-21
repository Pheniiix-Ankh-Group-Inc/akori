"use client"

import { Button } from "@/components/ui/Button"
import type { Ressource } from "@/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const CATEGORIE_LABELS: Record<string, string> = {
  rapport:     "Rapport",
  tutoriel:    "Tutoriel",
  gouvernance: "Gouvernance",
  analyse:     "Analyse",
}

interface Props {
  ressources: Ressource[] | null
}

export function SectionRessources({ ressources }: Props) {
  const data = ressources ?? []
  const featured = data.find((r) => r.featured) ?? data[0] ?? null
  const rest     = data.filter((r) => r._id !== featured?._id).slice(0, 2)

  return (
    <section
      id="resources"
      style={{ padding: "var(--pad) 0", background: "var(--bg)" }}
    >
      {/* Top */}
      <div style={{ padding: "0 3rem", marginBottom: "5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="label" data-reveal>Savoir</span>
          <h2 className="heading-md" data-reveal data-delay="1">
            Ressources & <em className="text-italic">Analyses</em>
          </h2>
        </div>
        <Button variant="ghost" href="/ressources">Toutes les ressources</Button>
      </div>

      {/* Grille magazine */}
      <div style={{ padding: "0 3rem" }}>
        {data.length === 0 ? (
          <p style={{ fontSize: "0.86rem", color: "var(--texte)", textAlign: "center", padding: "4rem 0" }}>
            Aucune ressource disponible.
          </p>
        ) : (
          <div
            className="res-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              border: "1px solid var(--border)",
              borderRight: "none",
              borderBottom: "none",
            }}
          >
            {/* Article vedette */}
            {featured && (
              <div
                data-reveal
                style={{
                  gridRow: rest.length > 0 ? "1 / 3" : "1",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "3rem",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "background 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1.5rem" }}>
                  {CATEGORIE_LABELS[featured.categorie] ?? featured.categorie}
                </span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 700, color: "var(--blanc)", lineHeight: 1.2, flex: 1, marginBottom: "1.5rem" }}>
                  {featured.titre}
                </h3>
                {featured.extrait && (
                  <p style={{ fontSize: "0.88rem", color: "var(--texte-2)", lineHeight: 1.75, marginBottom: "2rem" }}>
                    {featured.extrait}
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1.25rem", borderTop: "1px solid var(--border)", marginTop: "auto", fontSize: "0.74rem", color: "var(--texte)" }}>
                  <span>{featured.auteur}</span>
                  <span>
                    {featured.publishedAt
                      ? format(new Date(featured.publishedAt), "d MMM yyyy", { locale: fr })
                      : ""
                    }
                    {featured.tempsLecture ? ` · ${featured.tempsLecture} min` : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Articles secondaires */}
            {rest.map((r, i) => (
              <div
                key={r._id}
                data-reveal
                data-delay={String(i + 1)}
                style={{
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "3rem",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "background 0.3s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1rem" }}>
                  {CATEGORIE_LABELS[r.categorie] ?? r.categorie}
                </span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--blanc)", lineHeight: 1.3, flex: 1, marginBottom: "1rem" }}>
                  {r.titre}
                </h3>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--texte)", paddingTop: "1rem", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
                  <span>{r.auteur}</span>
                  <span>{r.tempsLecture ? `${r.tempsLecture} min` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .res-grid { grid-template-columns: 1fr !important; }
          .res-grid > div { grid-row: auto !important; }
        }
      `}</style>
    </section>
  )
}