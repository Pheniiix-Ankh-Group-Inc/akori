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

/** Public methodology with the required data attribution only. */
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

          <section aria-labelledby="ds-credits" className="ed-stack" style={{ gap: "0.75rem" }}>
            <h2 id="ds-credits" className="ed-h3">{t("creditsTitle")}</h2>
            <p className="ed-muted" style={{ fontSize: "0.9375rem" }}>
              <a className="ed-link" href="https://github.com/electric-capital/open-dev-data" {...ext}>Open Dev Data by Electric Capital</a>
              {" · © 2025 Electric Capital Partners, LLC · "}
              <a className="ed-link" href="https://creativecommons.org/licenses/by/4.0/" {...ext}>CC BY 4.0</a>.
              {" "}{t("creditsChanges")}
            </p>
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
