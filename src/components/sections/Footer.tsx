import { useTranslations } from "next-intl"
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher"

export function Footer() {
  const t = useTranslations("Footer")

  return (
    <footer className="bib-footer" data-section="16" data-title="THE SIGN-OFF">
      <div className="bib-footer-mega">Black <em>in</em> Blockchain.</div>

      <div className="bib-footer-grid">
        <div>
          <div className="bib-footer-brand">Black <em>in</em> Blockchain</div>
          <p className="bib-footer-tagline">{t("tagline")}</p>
          <div style={{ marginTop: "24px" }}><LocaleSwitcher /></div>
        </div>
        <div className="bib-footer-col">
          <h4>{t("collective")}</h4>
          <ul>
            <li><a href="#manifesto">{t("collectiveManifesto")}</a></li>
            <li><a href="#chapters">{t("collectiveChapters")}</a></li>
            <li><a href="#">{t("collectiveGovernance")}</a></li>
            <li><a href="#">{t("collectivePress")}</a></li>
          </ul>
        </div>
        <div className="bib-footer-col">
          <h4>{t("programs")}</h4>
          <ul>
            <li><a href="#pillars">{t("programsFounder")}</a></li>
            <li><a href="#pillars">{t("programsFellowships")}</a></li>
            <li><a href="#pillars">{t("programsFund")}</a></li>
            <li><a href="#gathering">{t("programsGathering")}</a></li>
          </ul>
        </div>
        <div className="bib-footer-col">
          <h4>{t("elsewhere")}</h4>
          <ul>
            <li><a href="#">{t("elsewhereX")}</a></li>
            <li><a href="#">{t("elsewhereFarcaster")}</a></li>
            <li><a href="#">{t("elsewhereLens")}</a></li>
            <li><a href="#">{t("elsewhereNewsletter")}</a></li>
          </ul>
        </div>
      </div>
      <div className="bib-footer-bottom">
        <span>{t("copyright")}</span>
        <span dangerouslySetInnerHTML={{ __html: t.raw("built") as string }} />
        <span>{t("version")}</span>
      </div>
    </footer>
  )
}
