import { useTranslations } from "next-intl"

const PILLARS = ["p1", "p2", "p5", "p7", "p8", "p9"] as const

export function SectionPillars() {
  const t = useTranslations("Pillars")

  return (
    <section className="bib-pillars" id="pillars" data-section="06" data-title="THE WHITE PAPER">
      <div className="bib-pillars-head">
        <div>
          <div className="bib-pillars-eyebrow">{t("eyebrow")}</div>
          <h2 className="bib-pillars-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
        </div>
        <p className="bib-pillars-intro">{t("intro")}</p>
      </div>

      <div className="bib-pillars-grid">
        {PILLARS.map((key, i) => (
          <div key={key} className="bib-pillar">
            <div className="bib-pillar-num">— {String(i + 1).padStart(2, "0")}</div>
            <h3
              className="bib-pillar-title"
              dangerouslySetInnerHTML={{ __html: t.raw(`items.${key}.title`) }}
            />
            <p className="bib-pillar-text">{t(`items.${key}.text`)}</p>
            <div className="bib-pillar-meta">
              <span>{t(`items.${key}.meta1`)}</span>
              <span>{t(`items.${key}.meta2`)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
