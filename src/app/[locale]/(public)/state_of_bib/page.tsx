import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { intlLocale } from "@/lib/content/locales"
import { SobMap } from "@/components/state-of-bib/SobMap"
import { SobEcosystems } from "@/components/state-of-bib/SobEcosystems"
import { SobCohort } from "@/components/state-of-bib/SobCohort"
import { loadSobSnapshot } from "@/lib/sob/load"
import { getPublishedInsight } from "@/lib/sob/insights"

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "StateOfBib.meta" })
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description"), type: "article" },
  }
}


/** « § 01  Mouvement Un » → « § 01 · Mouvement Un ». */
const movementNum = (raw: string) => raw.replace(/\s{2,}/, " · ")

/**
 * State of BIB (charte claire) : faits de l'instantané, indicateur principal,
 * analyse publiée (si un administrateur l'a validée), puis cinq mouvements.
 * Tous les chiffres viennent du dernier instantané Electric Capital.
 */
export default async function StateOfBibPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "StateOfBib" })
  const s = await getTranslations({ locale, namespace: "Site.sob" })
  const { meta, headline, countryMap, topCities, ecoMix, cohort } = await loadSobSnapshot()
  // Analyse IA : affichée uniquement si elle a été publiée par un administrateur.
  const insight = await getPublishedInsight(locale)
  const loc = intlLocale(locale)
  const nf = new Intl.NumberFormat(loc)
  const asOf = new Intl.DateTimeFormat(loc, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${headline.snapshot_date}T00:00:00Z`))

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div className="ed-stack" style={{ gap: "1.75rem" }}>
          <p className="ed-eyebrow">{s("eyebrow")}</p>
          <h1 className="ed-display" style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}>
            {s("titleStart")} <em>{s("titleIn")}</em> {s("titleEnd")}
          </h1>
          <p className="ed-lede">{s("lede")}</p>
          <dl className="sob-facts">
            <div><dt>{s("facts.asOf")}</dt><dd>{asOf}</dd></div>
            <div><dt>{s("facts.source")}</dt><dd>{meta.source.name}</dd></div>
            <div><dt>{s("facts.license")}</dt><dd>{meta.source.license}</dd></div>
            <div><dt>{s("facts.scope")}</dt><dd>{s("facts.scopeVal", { n: meta.scope.countries_in_scope })}</dd></div>
            <div><dt>{s("facts.version")}</dt><dd>{meta.dataset_version}</dd></div>
          </dl>
        </div>
      </section>

      <section className="ed-section ed-section-white" aria-labelledby="sob-headline">
        <div className="ed-wrap ed-stack" style={{ gap: "2.5rem" }}>
          <div className="ed-stack" style={{ gap: "1rem" }}>
            <h2 id="sob-headline" className="sob-hero-number">{nf.format(headline.devs_active_28d)}</h2>
            <p className="sob-hero-caption">
              {t("hero.captionStart")} <b>{nf.format(headline.ecosystems)}</b> {t("hero.captionMid")} <b>{nf.format(headline.cities)}</b> {t("hero.captionMid2")} {t("hero.captionEmEnd")}
            </p>
          </div>
          <div className="ed-stats">
            <div className="ed-stat"><strong>{nf.format(headline.commits_lifetime)}</strong><span>{(await getTranslations({ locale, namespace: "Site.home" }))("kpi.commits")}</span></div>
            <div className="ed-stat"><strong>{nf.format(headline.countries)}</strong><span>{t("hero.stat2Sub")}</span></div>
            <div className="ed-stat"><strong>{nf.format(headline.ecosystems)}</strong><span>{t("hero.stat3Sub")}</span></div>
          </div>
          <p className="ed-muted">{s("updated")}</p>
        </div>
      </section>

      {insight && (
        <section className="ed-section" aria-labelledby="sob-analysis">
          <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.25rem" }}>
            <p className="ed-eyebrow">{s("analysis")}</p>
            <h2 id="sob-analysis" className="ed-h2">{insight.content.title}</h2>
            <div className="ed-prose" style={{ whiteSpace: "pre-line" }}>{insight.content.rendered_body}</div>
            {insight.content.limitations && <p className="ed-note">{insight.content.limitations}</p>}
            <p className="ed-muted">
              {meta.source.name} · {meta.source.license} · {insight.sources[0]?.as_of_date} — {s("analysisNote")}
            </p>
          </div>
        </section>
      )}

      <section className="ed-section">
        <div className="ed-wrap">
          <div className="sob-movement-head">
            <div>
              <p className="sob-section-num">{movementNum(t("m1.num"))}</p>
              <h2 className="sob-movement-title" dangerouslySetInnerHTML={{ __html: t.raw("m1.title") }} />
            </div>
            <div className="sob-movement-lede">
              <p>{t("m1.lede1")}</p>
              <p>{t("m1.lede2")}</p>
            </div>
          </div>
          <SobMap
            map={countryMap}
            labels={{
              top10: t("m1.top10"),
              legendLabel: t("m1.legendLabel"),
              legendLow: t("m1.legendLow"),
              legendHigh: t("m1.legendHigh"),
              tipCommits: t("m1.tipCommits"),
              tipActive: t("m1.tipActive"),
            }}
          />
        </div>
      </section>

      <section className="ed-section ed-section-white">
        <div className="ed-wrap">
          <div className="sob-movement-head">
            <div>
              <p className="sob-section-num">{movementNum(t("m2.num"))}</p>
              <h2 className="sob-movement-title" dangerouslySetInnerHTML={{ __html: t.raw("m2.title") }} />
            </div>
            <div className="sob-movement-lede">
              <p dangerouslySetInnerHTML={{ __html: t.raw("m2.lede1") }} />
              <p>{t("m2.lede2")}</p>
            </div>
          </div>
          <div className="sob-cities">
            {(() => {
              const max = Math.max(...topCities.map(c => c.devs_active_28d))
              return topCities.map(c => (
                <div key={c.city} className="sob-city-row">
                  <div className="sob-city-rank">{String(c.rank).padStart(2, "0")}</div>
                  <div className="sob-city-name">{c.city}<em>{c.country}</em></div>
                  <div
                    className="sob-city-bar"
                    style={{ width: `${((c.devs_active_28d / max) * 100).toFixed(1)}%` }}
                  />
                  <div className="sob-city-count"><b>{nf.format(c.devs_active_28d)}</b> {t("m2.devs")}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      </section>

      <section className="ed-section">
        <div className="ed-wrap">
          <div className="sob-movement-head">
            <div>
              <p className="sob-section-num">{movementNum(t("m3.num"))}</p>
              <h2 className="sob-movement-title" dangerouslySetInnerHTML={{ __html: t.raw("m3.title") }} />
            </div>
            <div className="sob-movement-lede">
              <p>{t("m3.lede1")}</p>
              <p>{t("m3.lede2")}</p>
            </div>
          </div>
          <SobEcosystems
            ecosystems={ecoMix.ecosystems}
            labels={{ devsLabel: t("m3.devsLabel"), indexLabel: t("m3.indexLabel") }}
          />
        </div>
      </section>

      <section className="ed-section ed-section-white">
        <div className="ed-wrap">
          <div className="sob-movement-head">
            <div>
              <p className="sob-section-num">{movementNum(t("m4.num"))}</p>
              <h2 className="sob-movement-title" dangerouslySetInnerHTML={{ __html: t.raw("m4.title") }} />
            </div>
            <div className="sob-movement-lede">
              <p>{t("m4.lede1")}</p>
              <p>{t("m4.lede2")}</p>
            </div>
          </div>
          <SobCohort
            cohort={cohort}
            labels={{
              newcomersShort: t("m4.newcomersShort"),
              newcomersName: t("m4.newcomersName"),
              apprenticedShort: t("m4.apprenticedShort"),
              apprenticedName: t("m4.apprenticedName"),
              eldersShort: t("m4.eldersShort"),
              eldersName: t("m4.eldersName"),
            }}
          />
        </div>
      </section>

      <section className="ed-section">
        <div className="ed-wrap">
          <div className="sob-movement-head">
            <div>
              <p className="sob-section-num">{movementNum(t("m5.num"))}</p>
              <h2 className="sob-movement-title" dangerouslySetInnerHTML={{ __html: t.raw("m5.title") }} />
            </div>
            <div className="sob-movement-lede">
              <p>{t("m5.lede1")}</p>
              <p>{t("m5.lede2")}</p>
            </div>
          </div>
          <div className="sob-method-grid">
            <div className="sob-method-col sees">
              <h4>{t("m5.seesHeading")}</h4>
              <ul>
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.sees1") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.sees2") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.sees3") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.sees4") }} />
              </ul>
            </div>
            <div className="sob-method-col doesnt">
              <h4>{t("m5.doesntHeading")}</h4>
              <ul>
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.doesnt1") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.doesnt2") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.doesnt3") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("m5.doesnt4") }} />
              </ul>
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
