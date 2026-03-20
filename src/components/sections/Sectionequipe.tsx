"use client"

import type { MembreEquipe } from "@/types"
import { urlFor } from "@/sanity/lib/image"

interface Props {
  equipe: MembreEquipe[] | null
}

export function SectionEquipe({ equipe }: Props) {
  const data = equipe ?? []

  return (
    <section
      id="about"
      style={{ padding: "var(--pad) 0", background: "var(--bg)" }}
    >
      {/* Top */}
      <div style={{ padding: "0 3rem", marginBottom: "5rem" }}>
        <span className="label" data-reveal>Les fondateurs</span>
        <h2 className="heading-md" data-reveal data-delay="1">
          L'équipe <em className="text-italic">fondatrice</em>
        </h2>
      </div>

      {/* Grille */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(data.length, 3)}, 1fr)`,
          borderTop: "1px solid var(--border)",
          borderLeft: "1px solid var(--border)",
          margin: "0 3rem",
        }}
        className="team-grid"
      >
        {data.length === 0 ? (
          <div style={{ padding: "3rem", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>Aucun membre.</p>
          </div>
        ) : data.map((membre, i) => (
          <div
            key={membre._id}
            data-reveal
            data-delay={String(i + 1)}
            className="team-card"
          >
            {/* Avatar */}
            <div className="team-avatar">
              {membre.photo ? (
                <img
                  src={urlFor(membre.photo).width(64).height(64).url()}
                  alt={membre.nom}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                membre.initiales ?? membre.nom.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="team-name">{membre.nom}</div>
            <div className="team-role">{membre.role}</div>
            <p className="team-bio">{membre.bio}</p>

            {/* Liens sociaux */}
            <div className="team-social">
              {membre.linkedin && (
                <a href={membre.linkedin} target="_blank" rel="noopener noreferrer" className="team-social-link">in</a>
              )}
              {membre.twitter && (
                <a href={membre.twitter} target="_blank" rel="noopener noreferrer" className="team-social-link">𝕏</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}