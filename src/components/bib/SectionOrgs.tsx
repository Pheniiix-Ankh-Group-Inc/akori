"use client"
import { useTranslations } from "next-intl"
import { useBibStaggerReveal } from "./useBibReveal"

const ORGS = ["o1", "o2", "o3", "o4", "o5", "o6", "o7", "o8", "o9"] as const

export function SectionOrgs() {
  const t = useTranslations("Orgs")
  const gridRef = useBibStaggerReveal<HTMLDivElement>({
    childSelector: ".bib-org-card",
    from: { opacity: 0, translateY: 24 },
    step: 60,
  })

  return (
    <section className="bib-orgs" data-section="08" data-title="ALIGNED ORBITS">
      <div className="bib-orgs-container">
        <div className="bib-orgs-head">
          <div>
            <div className="bib-eyebrow">{t("eyebrow")}</div>
            <h2 className="bib-orgs-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
          </div>
          <p className="bib-orgs-intro">{t("intro")}</p>
        </div>

        <div className="bib-org-grid" ref={gridRef}>
          {ORGS.map((key, i) => (
            <a key={key} className="bib-org-card" href="#" data-hover>
              <div className="bib-org-card-num">
                <b>— {String(i + 1).padStart(2, "0")}</b>
                <span>{t(`items.${key}.tag`)}</span>
              </div>
              <h3
                className="bib-org-card-name"
                dangerouslySetInnerHTML={{ __html: t.raw(`items.${key}.name`) }}
              />
              <div className="bib-org-card-location">{t(`items.${key}.location`)}</div>
              <p className="bib-org-card-desc">{t(`items.${key}.desc`)}</p>
              <span className="bib-org-card-link">{t(`items.${key}.link`)}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
