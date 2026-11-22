import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Site.pages" })
  return { title: t("items.about.title"), description: t("items.about.lede") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.about" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{p("items.about.title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>
      <section className="ed-section ed-section-white" aria-labelledby="about-approach">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.5rem" }}>
          <h2 id="about-approach" className="ed-h2">{t("approachTitle")}</h2>
          <div className="ed-prose"><p>{t("approachText")}</p></div>
          <Link className="ed-link" href="/fondateurs">{t("foundersLink")} →</Link>
        </div>
      </section>
      <section className="ed-section" aria-labelledby="about-activities">
        <div className="ed-wrap ed-stack" style={{ gap: "2rem" }}>
          <h2 id="about-activities" className="ed-h2">{t("activitiesTitle")}</h2>
          <div className="ed-grid">
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("meetTitle")}</h3>
              <p className="ed-muted">{t("meetText")}</p>
              <Link className="ed-link" href="/evenements">{t("meetLink")} →</Link>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("learnTitle")}</h3>
              <p className="ed-muted">{t("learnText")}</p>
              <Link className="ed-link" href="/resources">{t("learnLink")} →</Link>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("observeTitle")}</h3>
              <p className="ed-muted">{t("observeText")}</p>
              <Link className="ed-link" href="/state_of_bib">{t("observeLink")} →</Link>
            </div></article>
          </div>
        </div>
      </section>
      <section className="ed-section ed-section-white">
        <div className="ed-wrap ed-row" style={{ justifyContent: "space-between", gap: "1.5rem" }}>
          <h2 className="ed-h3">{t("missionCta")}</h2>
          <Link className="ed-btn ed-btn-dark" href="/mission">{t("missionLink")}</Link>
        </div>
      </section>
    </main>
  )
}
