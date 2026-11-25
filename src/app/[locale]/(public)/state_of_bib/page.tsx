import { TrackView } from "@/components/analytics/TrackView"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { intlLocale } from "@/lib/content/locales"
import { sobFreshness } from "@/lib/sob/freshness"
import { SobMap } from "@/components/state-of-bib/SobMap"
import { SobEcosystems } from "@/components/state-of-bib/SobEcosystems"
import { SobCohort } from "@/components/state-of-bib/SobCohort"
import { SobExplorerProvider } from "@/components/state-of-bib/SobExplorer"
import { SobPeriodBar } from "@/components/state-of-bib/SobPeriodBar"
import { LazyMount } from "@/components/state-of-bib/LazyMount"
import { Link } from "@/i18n/navigation"
import { EditorialImage, hasVisual } from "@/components/ui/EditorialImage"
import { isSobAvailable, loadSobState, loadSobTrend } from "@/lib/sob/load"
import { SobTrend } from "@/components/state-of-bib/SobTrend"
import { getPublishedInsight } from "@/lib/sob/insights"
import { localizeSnapshot } from "@/lib/geo/names"
import { SCOPE_COUNTRIES } from "@/lib/sob/scope"
import { listSobVersions, loadSobVersion, loadSobDeltas } from "@/lib/sob/history"

// A temporary read error must not be embedded in a 15-minute static page.
// The expensive verified dataset itself remains cached (positive results only).
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ version?: string }> }

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
 * Tous les chiffres viennent de la version vérifiée courante ; sans version
 * valide, la page affiche un état d'indisponibilité (jamais de chiffres non
 * contrôlés). Fournisseurs et licences : page légale /data-sources uniquement.
 */
export default async function StateOfBibPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "StateOfBib" })
  const s = await getTranslations({ locale, namespace: "Site.sob" })
  const selectedVersion = (await searchParams).version
  const [snapshot, trend, versions] = await Promise.all([
    selectedVersion ? loadSobVersion(selectedVersion) : loadSobState(),
    loadSobTrend("devs_active_28d"),
    listSobVersions(),
  ])
  if (!isSobAvailable(snapshot)) {
    return (
      <main>
        <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "6rem" }}>
          <div className="ed-stack" style={{ gap: "1.75rem", maxWidth: "46rem" }}>
            <p className="ed-eyebrow">{s("eyebrow")}</p>
            <h1 className="ed-h1">
              {s("titleStart")} <em>{s("titleIn")}</em> {s("titleEnd")}
            </h1>
            <div className="ed-note" role="status">
              <h2 className="ed-h3" style={{ marginBottom: "0.5rem" }}>{s("unavailableTitle")}</h2>
              <p>{s("unavailableText")}</p>
            </div>
            <p><Link href="/data-sources" className="ed-link">{s("methodLink")} →</Link></p>
          </div>
        </section>
      </main>
    )
  }
  // Pays et villes dans la langue de la page (codes ISO inchangés).
  const { meta, headline, countryMap, topCities, ecoMix, cohort, origin } = localizeSnapshot(snapshot, locale)
  const deltas = await loadSobDeltas(snapshot.version)
  // Analyse IA : affichée uniquement si elle a été publiée par un administrateur.
  const insight = await getPublishedInsight(locale)
  const loc = intlLocale(locale)
  const nf = new Intl.NumberFormat(loc)
  const asOf = new Intl.DateTimeFormat(loc, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${headline.snapshot_date}T00:00:00Z`))
  const freshness = sobFreshness(headline.snapshot_date)

  return (
    <main>
      <TrackView event="state_of_bib_view" props={{ version: meta.dataset_version || null }} />
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div className="ed-stack" style={{ gap: "1.75rem" }}>
          <p className="ed-eyebrow">{s("eyebrow")}</p>
          <h1 className="ed-h1">
            {s("titleStart")} <em>{s("titleIn")}</em> {s("titleEnd")}
          </h1>
          <p className="ed-lede">{s("lede")}</p>
          <form method="get" className="ed-stack" style={{ gap: "0.5rem", maxWidth: "24rem" }}>
            <label htmlFor="sob-version">{s("facts.version")}</label>
            <select id="sob-version" name="version" defaultValue={selectedVersion ?? ""} className="ed-input">
              <option value="">{locale === "fr" ? "Dernière version publiée" : locale === "es" ? "Última versión publicada" : "Latest published version"}</option>
              {versions.map(v => <option key={v.provider_version} value={v.provider_version}>{v.provider_version}{v.as_of_date ? ` — ${v.as_of_date}` : ""}</option>)}
            </select>
            <button type="submit" className="ed-link">{locale === "fr" ? "Consulter cette version" : locale === "es" ? "Ver esta versión" : "View this version"}</button>
          </form>
          <dl className="sob-facts">
            <div><dt>{s("facts.asOf")}</dt><dd>{asOf}</dd></div>
            <div><dt>{s("facts.scope")}</dt><dd>{s("facts.scopeVal", { n: meta.scope.countries_in_scope, total: SCOPE_COUNTRIES })}</dd></div>
            <div><dt>{s("facts.version")}</dt><dd>{snapshot.version}</dd></div>
          </dl>
          <p className="ed-muted">{s("diaspora")} <Link href="/data-sources" className="ed-link">{s("methodLink")}</Link></p>
          {freshness.stale && <p className="ed-note" role="note">{s("stale", { date: asOf })}</p>}
          {origin === "fallback" && <p className="ed-note" role="note">{s("fallback")}</p>}
        </div>
      </section>
      {hasVisual("sob") && (
        <div className="ed-wrap ed-hero-media">
          <EditorialImage name="sob" locale={locale} ratio="3x1" sizes="(max-width: 1264px) 100vw, 1200px" />
        </div>
      )}

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
          {deltas.length > 0 && (
            <div className="ed-stack" style={{ gap: "0.75rem" }}>
              <h3 className="ed-h3">{locale === "fr" ? "Évolution depuis la version précédente" : locale === "es" ? "Cambios desde la versión anterior" : "Changes since previous version"}</h3>
              <table className="sob-trend-table">
                <thead><tr>
                  <th>{locale === "fr" ? "Indicateur" : locale === "es" ? "Indicador" : "Metric"}</th>
                  <th>{locale === "fr" ? "Avant" : locale === "es" ? "Antes" : "Previous"}</th>
                  <th>{locale === "fr" ? "Actuel" : locale === "es" ? "Actual" : "Current"}</th>
                  <th>{locale === "fr" ? "Écart" : locale === "es" ? "Diferencia" : "Difference"}</th>
                </tr></thead>
                <tbody>{deltas.map(d => <tr key={d.metric_key}>
                  <td>{d.metric_key.replaceAll("_", " ")}</td>
                  <td>{d.previous_value == null ? "—" : nf.format(d.previous_value)}</td>
                  <td>{d.current_value == null ? "—" : nf.format(d.current_value)}</td>
                  <td>{d.delta == null ? d.change_kind : nf.format(d.delta)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
          <div className="ed-stack" style={{ gap: "1rem" }}>
            <h3 className="ed-h3">{s("trendTitle")}</h3>
            <SobTrend points={trend} locale={loc} label={s("trendLabel")} emptyNote={s("trendEmpty")} />
          </div>
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
              {insight.sources[0]?.as_of_date} — {s("analysisNote")}
            </p>
          </div>
        </section>
      )}

      <SobExplorerProvider
        months={ecoMix.months}
        countries={countryMap.map((c) => c.iso_a3)}
        ecosystems={ecoMix.ecosystems.map((e) => e.id)}
      >
      <div className="sob-sticky-filters">
        <div className="ed-wrap">
          <SobPeriodBar />
        </div>
      </div>
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
          <SobMap map={countryMap} />
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
          <LazyMount minHeight={760}>
            <SobEcosystems ecosystems={ecoMix.ecosystems} months={ecoMix.months} />
          </LazyMount>
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
          <LazyMount minHeight={520}>
            <SobCohort
              cohort={cohort}
              labels={{
                devs_0_1y: { short: t("m4.newcomersShort"), name: t("m4.newcomersName") },
                devs_1_2y: { short: t("m4.apprenticedShort"), name: t("m4.apprenticedName") },
                devs_2y_plus: { short: t("m4.eldersShort"), name: t("m4.eldersName") },
              }}
            />
          </LazyMount>
        </div>
      </section>

      </SobExplorerProvider>

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
          <p style={{ marginTop: "2.5rem" }}><Link href="/data-sources" className="ed-link">{s("methodLink")} →</Link></p>
        </div>
      </section>

    </main>
  )
}
