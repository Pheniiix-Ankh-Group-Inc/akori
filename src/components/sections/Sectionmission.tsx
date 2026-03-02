"use client"

/**
 * SectionMission — Section 2
 * Citation géante centrée.
 * 4 piliers en tableau horizontal avec séparateurs.
 */

const PILLARS = [
  {
    n:     "01",
    title: "Réseau",
    desc:  "Connecter les professionnels noirs de la blockchain à l'échelle mondiale, par secteur et par expertise.",
  },
  {
    n:     "02",
    title: "Solutions",
    desc:  "Co-créer des réponses blockchain aux défis concrets rencontrés par la communauté dans tous les secteurs.",
  },
  {
    n:     "03",
    title: "Éducation",
    desc:  "Démocratiser les savoirs blockchain — des fondamentaux aux cas d'usage avancés — pour tous les profils.",
  },
  {
    n:     "04",
    title: "Impact",
    desc:  "Mesurer, documenter et amplifier l'influence économique et institutionnelle du réseau AfroChain.",
  },
]

export function SectionMission() {
  return (
    <section id="mission" className="">
      {/* Citation centrée */}
      <div className="section-pillars">
        <span className="label" data-reveal>
          Notre mission
        </span>

        <h2 className="heading-md mb-4" data-reveal data-delay="1">
          La blockchain n'est pas<br />
          qu'une technologie. C'est<br />
          un levier de{" "}
          <em className="text-italic">souveraineté.</em>
        </h2>

        <p className="text-base max-w-[600px] mx-auto" data-reveal data-delay="2">
          AfroChain crée le point de convergence qui manquait : un espace où les
          talents se rencontrent, où les problèmes concrets de la communauté trouvent
          des solutions technologiques, et où une nouvelle génération de leaders
          blockchain émerge.
        </p>
      </div>

      {/* Tableau 4 piliers */}
      <div className="pillars-grid">
        {PILLARS.map(({ n, title, desc }, i) => (
          <div
            key={n}
            className="pillar-item"
            data-reveal
            data-delay={String(i + 1)}
          >
            <div className="pillar-num">{n}</div>
            <div className="pillar-title">{title}</div>
            <div className="pillar-desc">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}