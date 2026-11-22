import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Site.pages" })
  return { title: t("items.contact.title"), description: t("items.contact.lede") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.contact" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{p("items.contact.title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>
      <section className="ed-section ed-section-white" aria-labelledby="contact-channels">
        <div className="ed-wrap ed-stack" style={{ gap: "2rem" }}>
          <h2 id="contact-channels" className="ed-h2">{t("channelsTitle")}</h2>
          <p className="ed-muted">{t("channelsText")}</p>
          <div className="ed-grid">
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("generalTitle")}</h3>
              <p className="ed-muted">{t("generalText")}</p>
              <a className="ed-link" href="mailto:contact@anbachain.org?subject=BIB%20-%20General">{t("writeLink")} →</a>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("partnersTitle")}</h3>
              <p className="ed-muted">{t("partnersText")}</p>
              <a className="ed-link" href="mailto:contact@anbachain.org?subject=BIB%20-%20Partnership">{t("writeLink")} →</a>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("eventsTitle")}</h3>
              <p className="ed-muted">{t("eventsText")}</p>
              <a className="ed-link" href="mailto:contact@anbachain.org?subject=BIB%20-%20Events">{t("writeLink")} →</a>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("pressTitle")}</h3>
              <p className="ed-muted">{t("pressText")}</p>
              <a className="ed-link" href="mailto:contact@anbachain.org?subject=BIB%20-%20Press">{t("writeLink")} →</a>
            </div></article>
          </div>
        </div>
      </section>
      <section className="ed-section" aria-labelledby="contact-direct">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.25rem" }}>
          <h2 id="contact-direct" className="ed-h2">{t("directTitle")}</h2>
          <a className="ed-h3 ed-link" href="mailto:contact@anbachain.org">contact@anbachain.org</a>
          <p className="ed-muted">{t("privacyNote")}</p>
          <div className="ed-row">
            <Link className="ed-btn ed-btn-line" href="/evenements">{t("eventsLink")}</Link>
            <Link className="ed-btn ed-btn-line" href="/privacy">{t("privacyLink")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
