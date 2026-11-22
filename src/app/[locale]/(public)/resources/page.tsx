import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Site.pages" })
  return { title: t("items.resources.title"), description: t("items.resources.lede") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.resources" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{p("items.resources.title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>
      <section className="ed-section ed-section-white" aria-labelledby="resources-explore">
        <div className="ed-wrap ed-stack" style={{ gap: "2rem" }}>
          <h2 id="resources-explore" className="ed-h2">{t("exploreTitle")}</h2>
          <p className="ed-muted">{t("exploreText")}</p>
          <div className="ed-grid">
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("stateTitle")}</h3>
              <p className="ed-muted">{t("stateText")}</p>
              <Link className="ed-link" href="/state_of_bib">{t("openResource")} →</Link>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("sourcesTitle")}</h3>
              <p className="ed-muted">{t("sourcesText")}</p>
              <Link className="ed-link" href="/data-sources">{t("openResource")} →</Link>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("eventsTitle")}</h3>
              <p className="ed-muted">{t("eventsText")}</p>
              <Link className="ed-link" href="/evenements">{t("openResource")} →</Link>
            </div></article>
            <article className="ed-card"><div className="ed-card-body">
              <h3 className="ed-h3">{t("peopleTitle")}</h3>
              <p className="ed-muted">{t("peopleText")}</p>
              <Link className="ed-link" href="/fondateurs">{t("openResource")} →</Link>
            </div></article>
          </div>
        </div>
      </section>
      <section className="ed-section">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1rem" }}>
          <h2 className="ed-h2">{t("futureTitle")}</h2>
          <p className="ed-muted">{t("futureText")}</p>
          <Link className="ed-btn ed-btn-line" href="/#newsletter">{t("newsletterLink")}</Link>
        </div>
      </section>
    </main>
  )
}
