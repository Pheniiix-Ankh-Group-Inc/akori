"use client";

/**
 * SectionEquipe — Section 10
 * 3 cartes fondateurs en tableau avec séparateurs.
 */

const FOUNDERS = [
  {
    initials: "XY",
    name:     "[Prénom Nom]",
    role:     "Co-fondateur · CEO",
    bio:      "Entrepreneur et expert blockchain depuis [X] ans. Sa vision : construire l'infrastructure économique et numérique de la diaspora africaine mondiale.",
  },
  {
    initials: "AB",
    name:     "[Prénom Nom]",
    role:     "Co-fondatrice · CTO",
    bio:      "Développeuse full-stack et architecte blockchain. Ancienne de [Entreprise/Université]. Spécialiste des systèmes distribués et de la gouvernance on-chain.",
  },
  {
    initials: "CD",
    name:     "[Prénom Nom]",
    role:     "Co-fondateur · Stratégie",
    bio:      "Expert en gouvernance et politiques publiques numériques. Conseil auprès de gouvernements et d'institutions sur la réglementation blockchain.",
  },
]

export function SectionEquipe() {
  return (
    <section id="equipe" className="section">
      {/* En-tête */}
      <div style={{ padding: "0 3rem", marginBottom: "4rem" }}>
        <span className="label" data-reveal>
          À propos
        </span>
        <h2 className="heading-md" data-reveal data-delay="1">
          L'équipe{" "}
          <em className="text-italic">fondatrice</em>
        </h2>
      </div>

      {/* Tableau fondateurs */}
      <div className="team-grid">
        {FOUNDERS.map(({ initials, name, role, bio }, i) => (
          <div
            key={initials}
            className="team-card"
            data-reveal
            data-delay={String(i + 1)}
          >
            {/* Avatar */}
            <div className="team-avatar">{initials}</div>

            {/* Nom */}
            <div className="team-name">{name}</div>

            {/* Rôle */}
            <div className="team-role">{role}</div>

            {/* Bio */}
            <p className="team-bio">{bio}</p>

            {/* Liens sociaux */}
            <div className="team-social">
              {["in", "𝕏"].map((icon) => (
                <a key={icon} href="#" className="team-social-link">
                  {icon}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}