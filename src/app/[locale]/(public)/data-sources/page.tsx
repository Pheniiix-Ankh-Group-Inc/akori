import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { intlLocale } from "@/lib/content/locales"
import { isSobAvailable, loadSobState } from "@/lib/sob/load"
import { PageHero } from "@/components/ui/PageHero"

export const revalidate = 900

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "DataSources" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

/**
 * Sources officielles (liens vérifiés dans le dépôt du fournisseur et sa
 * licence). Seule page publique où les fournisseurs de données State of BIB,
 * leurs licences et l'attribution sont présentés.
 */
const LINKS = {
  s1Site: "https://opendevdata.org",
  s1Repo: "https://github.com/electric-capital/open-dev-data",
  ccBy: "https://creativecommons.org/licenses/by/4.0/",
  ccByLegal: "https://creativecommons.org/licenses/by/4.0/legalcode",
  s2Site: "https://www.naturalearthdata.com",
  s2Repo: "https://github.com/topojson/world-atlas",
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const

export default async function DataSourcesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "DataSources" })
  const sob = await loadSobState()
  const loc = intlLocale(locale)
  const day = (iso: string) => new Intl.DateTimeFormat(loc, { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso))
  const method = t.raw("method") as string[]
  const limits = t.raw("limits") as string[]

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("eyebrow")} title={t("title")} lede={<>{t("intro")}<br /><span style={{ fontSize: "0.9375rem" }}>{t("updated")}</span></>} variant="index" />
      <section className="ed-wrap-narrow" style={{ paddingTop: "clamp(3rem, 8vh, 5rem)", paddingBottom: "5rem" }}>

        <div className="ed-stack" style={{ gap: "3rem" }}>
          <section aria-labelledby="ds-sources" className="ed-stack" style={{ gap: "1.5rem" }}>
            <h2 id="ds-sources" className="ed-h2">{t("sourcesTitle")}</h2>

            <article className="ed-card" aria-labelledby="ds-s1">
              <div className="ed-card-body" style={{ gap: "1rem" }}>
                <h3 id="ds-s1" className="ed-h3">{t("s1Name")}</h3>
                <dl className="ed-dl ed-dl-wide">
                  <dt>{t("dataset")}</dt><dd>{t("s1Dataset")}</dd>
                  <dt>{t("site")}</dt><dd><a className="ed-link" href={LINKS.s1Site} {...ext}>opendevdata.org</a></dd>
                  <dt>{t("repository")}</dt><dd><a className="ed-link" href={LINKS.s1Repo} {...ext}>github.com/electric-capital/open-dev-data</a></dd>
                  <dt>{t("license")}</dt><dd>{t("s1License")}</dd>
                  <dt>{t("licenseText")}</dt>
                  <dd>
                    <a className="ed-link" href={LINKS.ccBy} {...ext}>creativecommons.org/licenses/by/4.0</a>
                    {" · "}
                    <a className="ed-link" href={LINKS.ccByLegal} {...ext}>legalcode</a>
                  </dd>
                  <dt>{t("attribution")}</dt>
                  <dd>
                    {t("s1Attribution")}{" "}
                    <a className="ed-link" href={LINKS.s1Repo} {...ext}>Open Dev Data by Electric Capital</a>
                  </dd>
                  <dt>{t("changes")}</dt><dd>{t("s1Changes")}</dd>
                  <dt>{t("use")}</dt><dd>{t("s1Use")}</dd>
                </dl>
              </div>
            </article>

            <article className="ed-card" aria-labelledby="ds-s2">
              <div className="ed-card-body" style={{ gap: "1rem" }}>
                <h3 id="ds-s2" className="ed-h3">{t("s2Name")}</h3>
                <dl className="ed-dl ed-dl-wide">
                  <dt>{t("dataset")}</dt><dd>{t("s2Dataset")}</dd>
                  <dt>{t("site")}</dt><dd><a className="ed-link" href={LINKS.s2Site} {...ext}>naturalearthdata.com</a></dd>
                  <dt>{t("repository")}</dt><dd><a className="ed-link" href={LINKS.s2Repo} {...ext}>github.com/topojson/world-atlas</a></dd>
                  <dt>{t("license")}</dt><dd>{t("s2License")}</dd>
                  <dt>{t("attribution")}</dt><dd>{t("s2Attribution")}</dd>
                  <dt>{t("changes")}</dt><dd>{t("s2Changes")}</dd>
                  <dt>{t("use")}</dt><dd>{t("s2Use")}</dd>
                </dl>
              </div>
            </article>
          </section>

          <section aria-labelledby="ds-scope" className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="ds-scope" className="ed-h2">{t("scopeTitle")}</h2>
            <p>{t("scopeText")}</p>
            <h3 className="ed-h3">{t("diasporaTitle")}</h3>
            <p>{t("diasporaText")}</p>
          </section>

          <section aria-labelledby="ds-method" className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="ds-method" className="ed-h2">{t("methodTitle")}</h2>
            <ul className="ed-prose">{method.map((m) => <li key={m}>{m}</li>)}</ul>
          </section>

          <section aria-labelledby="ds-limits" className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="ds-limits" className="ed-h2">{t("limitsTitle")}</h2>
            <ul className="ed-prose">{limits.map((m) => <li key={m}>{m}</li>)}</ul>
          </section>

          <section aria-labelledby="ds-update" className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="ds-update" className="ed-h2">{t("updateTitle")}</h2>
            <p>{t("updateText")}</p>
            <h3 className="ed-h3">{t("currentTitle")}</h3>
            {isSobAvailable(sob) ? (
              <dl className="ed-dl ed-dl-wide">
                <dt>{t("currentVersion")}</dt><dd>{sob.version}</dd>
                <dt>{t("currentAsOf")}</dt><dd>{day(sob.headline.snapshot_date)}</dd>
                {sob.publishedAt && (<><dt>{t("currentPublished")}</dt><dd>{day(sob.publishedAt)}</dd></>)}
              </dl>
            ) : (
              <p className="ed-note">{t("currentNone")}</p>
            )}
          </section>

          <section aria-labelledby="ds-reuse" className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="ds-reuse" className="ed-h2">{t("noExportTitle")}</h2>
            <p>{t("noExportText")}</p>
          </section>

          <section aria-labelledby="ds-contact" className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="ds-contact" className="ed-h2">{t("contactTitle")}</h2>
            <p>{t("contactText")} <Link href="/contact" className="ed-link">{t("contactTitle")}</Link></p>
            <p><Link href="/state_of_bib" className="ed-link">← {t("back")}</Link></p>
          </section>
        </div>
      </section>
    </main>
  )
}
