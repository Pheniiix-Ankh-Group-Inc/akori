import { useTranslations } from "next-intl"

export function SectionCosmic() {
  const t = useTranslations("Cosmic")

  return (
    <section className="bib-cosmic" data-section="04" data-title="TRANSMISSION">
      <div className="bib-cosmic-stars" aria-hidden />

      <div className="bib-planet-wrap">
        <div className="bib-planet" aria-hidden />
        <div className="bib-rotating-text" aria-hidden>
          <svg viewBox="0 0 600 600">
            <defs>
              <path id="circlePath" d="M 300, 300 m -280, 0 a 280,280 0 1,1 560,0 a 280,280 0 1,1 -560,0" />
            </defs>
            <text>
              <textPath href="#circlePath">{t("rotating")}</textPath>
            </text>
          </svg>
        </div>
      </div>

      <div className="bib-cosmic-meta-l">{t("metaLeft")}</div>
      <div className="bib-cosmic-meta-r">{t("metaRight")}</div>

      <div className="bib-cosmic-caption" dangerouslySetInnerHTML={{ __html: t.raw("caption") }} />
    </section>
  )
}
