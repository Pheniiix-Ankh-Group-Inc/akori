"use client"

import { useTranslations } from "next-intl"

const PILLARS = (t: any) => [
  {
    n: "01",
    title: t("pillars.network.title"),
    desc: t("pillars.network.desc"),
  },
  {
    n: "02",
    title: t("pillars.solutions.title"),
    desc: t("pillars.solutions.desc"),
  },
  {
    n: "03",
    title: t("pillars.education.title"),
    desc: t("pillars.education.desc"),
  },
  {
    n: "04",
    title: t("pillars.impact.title"),
    desc: t("pillars.impact.desc"),
  },
]

export function SectionMission() {
  const t = useTranslations("sectionMission")

  return (
    <section id="mission" className="">
      {/* Citation centrée */}
      <div className="section-pillars">
        <span className="label" data-reveal>
          {t("label")}
        </span>

        <h2 className="heading-md mb-4" data-reveal data-delay="1">
          {t("title.line1")}<br />
          {t("title.line2")}<br />
          {t("title.line3")}{" "}
          <em className="text-italic">{t("title.highlight")}</em>
        </h2>

        <p className="text-base max-w-[600px] mx-auto" data-reveal data-delay="2">
          {t("description")}
        </p>
      </div>

      {/* Tableau 4 piliers */}
      <div className="pillars-grid">
        {PILLARS(t).map(({ n, title, desc }, i) => (
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