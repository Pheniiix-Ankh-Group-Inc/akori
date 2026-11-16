"use client"
import { useTranslations } from "next-intl"
import { useBibRevealSelf } from "./useBibReveal"

export function SectionManifesto() {
  const t = useTranslations("Manifesto")
  const ref = useBibRevealSelf<HTMLElement>()

  return (
    <section
      ref={ref}
      className="bib-manifesto bib-reveal"
      id="manifesto"
      data-section="02"
      data-title="THE MANIFESTO"
    >
      <div>
        <div className="bib-eyebrow" style={{ marginBottom: "32px" }}>{t("eyebrow")}</div>
        <h2 className="bib-manifesto-quote" dangerouslySetInnerHTML={{ __html: t.raw("quote") }} />
      </div>
      <div className="bib-manifesto-body">
        <p dangerouslySetInnerHTML={{ __html: t.raw("body1") }} />
        <p dangerouslySetInnerHTML={{ __html: t.raw("body2") }} />
        <div className="bib-manifesto-signature">
          <span>{t("signature")}</span>
          <small>{t("signatureBlock")}</small>
        </div>
      </div>
    </section>
  )
}
