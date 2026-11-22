import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Site.pages" })
  return { title: t("items.press.title"), description: t("items.press.lede") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.press" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{p("items.press.title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>
      <section className="ed-section ed-section-white" aria-labelledby="press-intro">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.5rem" }}>
          <h2 id="press-intro" className="ed-h2">{t("overviewTitle")}</h2>
          <div className="ed-prose"><p>{t("overviewText")}</p></div>
          <div className="ed-grid">
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("storiesTitle")}</h3>
              <p className="ed-muted">{t("storiesText")}</p>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("eventsTitle")}</h3>
              <p className="ed-muted">{t("eventsText")}</p>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("dataTitle")}</h3>
              <p className="ed-muted">{t("dataText")}</p>
            </div></article>
          </div>
        </div>
      </section>
      <section className="ed-section" aria-labelledby="press-contact">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.25rem" }}>
          <h2 id="press-contact" className="ed-h2">{t("contactTitle")}</h2>
          <p className="ed-lede">{t("contactText")}</p>
          <p className="ed-muted">{t("assetsNote")}</p>
          <div className="ed-row">
            <a className="ed-btn ed-btn-dark" href="mailto:contact@anbachain.org?subject=BIB%20-%20Press">{t("emailLink")}</a>
            <Link className="ed-btn ed-btn-line" href="/contact">{t("contactLink")}</Link>
          </div>
          <p className="ed-muted">contact@anbachain.org</p>
        </div>
      </section>
    </main>
  )
}
