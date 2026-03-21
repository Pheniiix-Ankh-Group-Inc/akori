"use client"

import { Button } from "@/components/ui/Button"

const STATS = [
  { num: "500+", lbl: "Membres professionnels" },
  { num: "12",   lbl: "Secteurs représentés"   },
  { num: "6",    lbl: "Pays"                   },
  { num: "2",   lbl: "Événements organisés"   },
]

/**
 * SectionHero — Section 1
 * Photo plein écran (100svh).
 * Texte en bas à gauche, titre massive, poids ultra-léger (200).
 * Stats en bas : ligne avec séparateurs verticaux.
 */
export function SectionHero() {
  return (
    <section id="hero" className="section-hero">
      {/* Photo plein écran */}
      <div className="hero-photo">
        <div className="hero-overlay" />
      </div>

      {/* Contenu texte */}
      <div className="hero-body">
        {/* Titre principal */}
        <h1 className="heading-xl mb-4" data-reveal data-delay="2">
          Bâtir l'avenir<br />
          <em className="text-italic">ensemble,</em>
          <br />
          sur la chaîne.
        </h1>

        {/* Sous-titre */}
        <p className="text-base max-w-[520px] mb-5" data-reveal data-delay="3">
          AnbaChain rassemble les professionnels noirs — entrepreneurs, développeurs,
          analystes, professeurs, juristes, institutionnels — pour accélérer l'adoption
          de la blockchain et construire des solutions concrètes pour notre communauté.
        </p>

        {/* CTA */}
        {/* <div className="flex gap-3 flex-wrap" data-reveal data-delay="4">
          <Button variant="white" href="#adhesion">Devenir membre</Button>
          <Button variant="ghost" href="#mission">Découvrir la mission</Button>
        </div> */}
      </div>

      {/* Stats */}
      <div className="hero-stats">
        {STATS.map(({ num, lbl }, i) => (
          <div key={lbl} className="hero-stat-item" data-reveal data-delay={String(i + 1)}>
            {num}
            <div className="hero-stat-label">{lbl}</div>
          </div>
        ))}
      </div>
    </section>
  )
}