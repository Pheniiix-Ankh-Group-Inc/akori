import { useTranslations } from "next-intl"
import { isKeyVisible } from "@/lib/content/claims"

export function SectionCta({ showUnverified = false }: { showUnverified?: boolean }) {
  const t = useTranslations("Cta")

  return (
    <section className="bib-cta" id="join" data-section="15" data-title="THE INVITATION">
      <div className="bib-cta-content">
        <div className="bib-cta-eyebrow">{t("eyebrow")}</div>
        <h2 className="bib-cta-title">
          <span dangerouslySetInnerHTML={{ __html: t.raw("titleLine1") }} />
          {t("titleLine2") && (
            <>
              <br />
              <span className="outline">{t("titleLine2")}</span>
            </>
          )}
        </h2>
        {isKeyVisible("Cta.sub", showUnverified) && <p className="bib-cta-sub">{t("sub")}</p>}
        <a href="#" className="bib-cta-button" data-hover>
          {t("button")}
        </a>
      </div>
    </section>
  )
}
