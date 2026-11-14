import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

/** Pied de page : uniquement des pages qui existent (certaines encore en préparation). */
export function Footer() {
  const t = useTranslations("Site.footer")
  const nav = useTranslations("Site.nav")
  const pages = useTranslations("Site.pages")

  return (
    <footer className="ed-footer">
      <div className="ed-footer-inner">
        <div className="ed-footer-brand">
          <span className="ed-logo">
            Black <em>in</em> Blockchain
          </span>
          <span className="ed-muted">{t("data")}</span>
          <span className="ed-muted">{t("copyright", { year: new Date().getFullYear() })}</span>
        </div>
        <nav aria-label={t("explore")}>
          <span className="ed-muted">{t("explore")}</span>
          <Link href="/fondateurs">{nav("about")}</Link>
          <Link href="/evenements">{nav("events")}</Link>
          <Link href="/en-action">{nav("inAction")}</Link>
          <Link href="/state_of_bib">{nav("stateOfBib")}</Link>
          <Link href="/#newsletter">{t("newsletter")}</Link>
        </nav>
        <nav aria-label={pages("more")}>
          <span className="ed-muted">{pages("more")}</span>
          <Link href="/mission">{pages("items.mission.title")}</Link>
          <Link href="/membership">{pages("items.membership.title")}</Link>
          <Link href="/resources">{pages("items.resources.title")}</Link>
          <Link href="/press">{pages("items.press.title")}</Link>
          <Link href="/contact">{pages("items.contact.title")}</Link>
        </nav>
        <nav aria-label={t("legal")}>
          <span className="ed-muted">{t("legal")}</span>
          <Link href="/terms">{t("terms")}</Link>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/cookies">{t("cookies")}</Link>
        </nav>
      </div>
    </footer>
  )
}
