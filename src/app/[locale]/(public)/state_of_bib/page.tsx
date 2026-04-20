import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { fmt, fmtK } from "@/components/state-of-bib/format"
import type {
  SobMeta,
  SobHeadline,
  SobCountry,
  SobCity,
  SobEcosystemMix,
  SobCohort as SobCohortData,
} from "@/components/state-of-bib/types"
import { SobMap } from "@/components/state-of-bib/SobMap"
import { SobEcosystems } from "@/components/state-of-bib/SobEcosystems"
import { SobCohort } from "@/components/state-of-bib/SobCohort"
import { SobMarquee } from "@/components/state-of-bib/SobMarquee"

import metaData from "../../../../../public/data/meta.json"
import headlineData from "../../../../../public/data/headline.json"
import countryMapData from "../../../../../public/data/country_map.json"
import topCitiesData from "../../../../../public/data/top_cities.json"
import ecoMixData from "../../../../../public/data/ecosystem_mix.json"
import cohortData from "../../../../../public/data/tenure_cohort.json"

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

const meta = metaData as SobMeta
const headline = headlineData as SobHeadline
const countryMap = countryMapData as SobCountry[]
const topCities = topCitiesData as SobCity[]
const ecoMix = ecoMixData as SobEcosystemMix
const cohort = cohortData as SobCohortData

function formatMovementNum(raw: string): string {
  const parts = raw.split(/\s{2,}/)
  if (parts.length < 2) return `<b>${raw}</b>`
  const [num, ...rest] = parts
  return `<b>${num}</b>&nbsp;&nbsp;${rest.join(" ").toUpperCase()}`
}

export default async function StateOfBibPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "StateOfBib" })

  return (
    <main className="sob">
      <header className="sob-masthead">
        <div className="sob-wrap">
          <div className="sob-masthead-top">
            <span>{t("masthead.editorial").toUpperCase()}</span>
            <span>
              {t("masthead.vol").toUpperCase()} <b>{t("masthead.volNum")}</b> · {t("masthead.volDate").toUpperCase()}
            </span>
            <span>
              {t("masthead.block").toUpperCase()} <b>{fmt(meta.block_number)}</b>
            </span>
          </div>
          <div className="sob-section-num">
            <b>{t("masthead.sectionNum")}</b>&nbsp;&nbsp;{t("masthead.sectionLabel").toUpperCase()}
          </div>
          <h1 className="sob-masthead-title">
            {t("masthead.titleLine1")}<br />
            {t("masthead.titleLine2")} <em>{t("masthead.titleLine2In")}</em> {t("masthead.titleLine2Last")}
          </h1>
          <div className="sob-masthead-sub">
            <p className="sob-masthead-lede">{t("masthead.lede")}</p>
            <div className="sob-masthead-meta">
              <div>{t("masthead.metaDataset").toUpperCase()} <span>{meta.dataset_version}</span></div>
              <div>{t("masthead.metaSnapshot").toUpperCase()} <span>{headline.snapshot_date}</span></div>
              <div>{t("masthead.metaSource").toUpperCase()} <span>{t("masthead.metaSourceVal")}</span></div>
              <div>{t("masthead.metaLicence").toUpperCase()} <span>{t("masthead.metaLicenceVal")}</span></div>
            </div>
          </div>
        </div>
      </header>

      <section className="sob-hero">
        <div className="sob-halo">
          <svg className="sob-halo-ring" viewBox="0 0 480 480" aria-hidden>
            <defs>
              <path id="sob-halo-path" d="M 240 240 m -216, 0 a 216,216 0 1,1 432,0 a 216,216 0 1,1 -432,0" />
            </defs>
            <text>
              <textPath href="#sob-halo-path" startOffset="0%">
                BLACK IN BLOCKCHAIN · ONE LEDGER · FOUR CONTINENTS · SIGNED ON-CHAIN ·
              </textPath>
            </text>
          </svg>
        </div>
        <div className="sob-wrap sob-hero-inner">
          <div className="sob-hero-eyebrow">{t("hero.eyebrow")}</div>
          <div className="sob-hero-number">
            {fmt(headline.devs_active_28d)}<em>.</em>
          </div>
          <p className="sob-hero-caption">
            {t("hero.captionStart")} <b>{fmt(headline.ecosystems)}</b> {t("hero.captionMid")} <b>{fmt(headline.cities)}</b> {t("hero.captionMid2")} <em>{t("hero.captionEmEnd")}</em>
          </p>
          <div className="sob-hero-stats">
            <div className="sob-hero-stat">
              <div className="sob-hero-stat-label">{t("hero.stat1Label").toUpperCase()}</div>
              <div className="sob-hero-stat-num">{fmtK(headline.commits_lifetime)}</div>
              <div className="sob-hero-stat-sub">{t("hero.stat1Sub").toUpperCase()}</div>
            </div>
            <div className="sob-hero-stat">
              <div className="sob-hero-stat-label">{t("hero.stat2Label").toUpperCase()}</div>
              <div className="sob-hero-stat-num">{fmt(headline.countries)}</div>
              <div className="sob-hero-stat-sub">{t("hero.stat2Sub").toUpperCase()}</div>
            </div>
            <div className="sob-hero-stat">
              <div className="sob-hero-stat-label">{t("hero.stat3Label").toUpperCase()}</div>
              <div className="sob-hero-stat-num">{fmt(headline.ecosystems)}</div>
              <div className="sob-hero-stat-sub">{t("hero.stat3Sub").toUpperCase()}</div>
            </div>
            <div className="sob-hero-stat">
              <div className="sob-hero-stat-label">{t("hero.stat4Label").toUpperCase()}</div>
              <div className="sob-hero-stat-num"><em>{t("hero.stat4Num")}</em></div>
              <div className="sob-hero-stat-sub">{meta.dataset_version}</div>
            </div>
          </div>
        </div>
      </section>

      <SobMarquee cities={topCities} />

      <section className="sob-movement light">
        <div className="sob-wrap">
          <div className="sob-movement-head">
            <div>
              <div className="sob-section-num" dangerouslySetInnerHTML={{ __html: formatMovementNum(t("m1.num")) }} />
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

      <section className="sob-movement">
        <div className="sob-wrap">
          <div className="sob-movement-head">
            <div>
              <div className="sob-section-num" dangerouslySetInnerHTML={{ __html: formatMovementNum(t("m2.num")) }} />
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
                  <div className="sob-city-rank">— {String(c.rank).padStart(2, "0")}</div>
                  <div className="sob-city-name">{c.city}<em>{c.country}</em></div>
                  <div
                    className="sob-city-bar"
                    style={{
                      width: `${((c.devs_active_28d / max) * 100).toFixed(1)}%`,
                      animationDelay: `${c.rank * 60}ms`,
                    }}
                  />
                  <div className="sob-city-count"><b>{fmt(c.devs_active_28d)}</b> {t("m2.devs").toUpperCase()}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      </section>

      <section className="sob-movement">
        <div className="sob-wrap">
          <div className="sob-movement-head">
            <div>
              <div className="sob-section-num" dangerouslySetInnerHTML={{ __html: formatMovementNum(t("m3.num")) }} />
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

      <section className="sob-movement">
        <div className="sob-wrap">
          <div className="sob-movement-head">
            <div>
              <div className="sob-section-num" dangerouslySetInnerHTML={{ __html: formatMovementNum(t("m4.num")) }} />
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

      <section className="sob-movement light">
        <div className="sob-wrap">
          <div className="sob-movement-head">
            <div>
              <div className="sob-section-num" dangerouslySetInnerHTML={{ __html: formatMovementNum(t("m5.num")) }} />
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

      <section className="sob-colophon">
        <div className="sob-colophon-inner">
          <div className="sob-hero-eyebrow" style={{ justifyContent: "center" }}>
            {t("colophon.num")}
          </div>
          <h2 className="sob-colophon-title">
            {t("colophon.titleLine1")}<br />
            <em>{t("colophon.titleLine2")}</em>
          </h2>
          <p className="sob-colophon-text">{t("colophon.text")}</p>
          <div className="sob-colophon-meta">
            {t("colophon.setInLabel").toUpperCase()} <b>{t("colophon.setInFonts").toUpperCase()}</b><br />
            {t("colophon.builtFromLabel").toUpperCase()} <b>{t("colophon.builtFromVal").toUpperCase()}</b><br />
            <br />
            {t("colophon.volLabel").toUpperCase()} <b>{t("masthead.volNum")}</b> · {t("masthead.volDate").toUpperCase()}<br />
            {t("colophon.datasetLabel").toUpperCase()} <span>{meta.dataset_version}</span> · {t("colophon.blockLabel").toUpperCase()} <span>{fmt(meta.block_number)}</span><br />
            <br />
            {t("colophon.copyright").toUpperCase()}<br />
            {t("colophon.url").toUpperCase()}
          </div>
        </div>
      </section>

      <div className="sob-mega">Black <em>in</em> Blockchain.</div>
    </main>
  )
}
