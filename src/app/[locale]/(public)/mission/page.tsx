import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const p = await getTranslations({ locale, namespace: "Site.pages" })
  const t = await getTranslations({ locale, namespace: "Institutional.mission" })
  return { title: p("items.mission.title"), description: t("intro") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.mission" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{p("items.mission.title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>
      <section className="ed-section ed-section-white" aria-labelledby="mission-pillars">
        <div className="ed-wrap ed-stack" style={{ gap: "2rem" }}>
          <h2 id="mission-pillars" className="ed-h2">{t("pillarsTitle")}</h2>
          <div className="ed-grid">
            <article className="ed-card"><div className="ed-card-body">
              <span className="ed-num">01</span>
              <h3 className="ed-h3">{t("connectTitle")}</h3>
              <p className="ed-muted">{t("connectText")}</p>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <span className="ed-num">02</span>
              <h3 className="ed-h3">{t("shareTitle")}</h3>
              <p className="ed-muted">{t("shareText")}</p>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <span className="ed-num">03</span>
              <h3 className="ed-h3">{t("highlightTitle")}</h3>
              <p className="ed-muted">{t("highlightText")}</p>
            </div></article>
          </div>
        </div>
      </section>
      <section className="ed-section" aria-labelledby="mission-method">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.5rem" }}>
          <h2 id="mission-method" className="ed-h2">{t("methodTitle")}</h2>
          <div className="ed-prose"><p>{t("methodText")}</p></div>
          <div className="ed-row">
            <Link className="ed-btn ed-btn-dark" href="/evenements">{t("eventsLink")}</Link>
            <Link className="ed-btn ed-btn-line" href="/data-sources">{t("sourcesLink")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
