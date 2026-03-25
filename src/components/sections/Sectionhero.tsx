"use client"

import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"

const STATS = (t: any) => [
  { num: "500+", lbl: t("stats.members") },
  { num: "12",   lbl: t("stats.sectors") },
  { num: "6",    lbl: t("stats.countries") },
  { num: "2",    lbl: t("stats.events") },
]

export function SectionHero() {
  const t = useTranslations("sectionHero")

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
          {t("title.line1")}<br />
          <em className="text-italic">{t("title.line2")}</em>
          <br />
          {t("title.line3")}
        </h1>

        {/* Sous-titre */}
        <p className="text-base max-w-[520px] mb-5" data-reveal data-delay="3">
          {t("description")}
        </p>
      </div>

      {/* Stats */}
      <div className="hero-stats">
        {STATS(t).map(({ num, lbl }, i) => (
          <div key={lbl} className="hero-stat-item" data-reveal data-delay={String(i + 1)}>
            {num}
            <div className="hero-stat-label">{lbl}</div>
          </div>
        ))}
      </div>
    </section>
  )
}