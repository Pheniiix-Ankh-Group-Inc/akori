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
import { EditorialImage } from "@/components/ui/EditorialImage"
import { AnimatedNumber } from "@/components/state-of-bib/AnimatedNumber"
import { CopyLink } from "@/components/state-of-bib/CopyLink"
import { DeltaBars } from "@/components/state-of-bib/DeltaBars"
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
  const im = await getTranslations({ locale, namespace: "Immersive.sobPage" })
  const asOf = new Intl.DateTimeFormat(loc, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${headline.snapshot_date}T00:00:00Z`))
  const freshness = sobFreshness(headline.snapshot_date)

  return (
    <main>
      <TrackView event="state_of_bib_view" props={{ version: meta.dataset_version || null }} />
      {/* Scène 01 · Perspective : photo de territoire plein cadre, faits et version immédiatement lisibles */}
      <header className="im im-ink sob-scene-hero" aria-labelledby="sob-title">
        <div className="sob-hero-media im-px" aria-hidden="true">
          <EditorialImage name="sob" locale={locale} ratio="fill" sizes="100vw" priority />
        </div>
        <div className="sob-hero-copy im-pad">
          <p className="im-ey">{s("eyebrow")}</p>
          <h1 id="sob-title" className="ph-title">
            <span className="im-line"><span>{s("titleStart")} <em>{s("titleIn")}</em> {s("titleEnd")}</span></span>
          </h1>
          <p className="im-p" style={{ fontSize: "1.1875rem", maxWidth: "40rem" }}>{s("lede")}</p>
          <nav className="sob-modes" aria-label={im("modes")}>
            <a href="#sob-numbers" className="ed-btn im-btn-lt">{im("modeStory")}</a>
            <a href="#sob-explore" className="im-link" style={{ color: "var(--accent-light)" }}>{im("modeExplore")}</a>
          </nav>
        </div>
      </header>
      <section className="im im-pad sob-facts-band" aria-label={s("facts.version")}>
        <dl className="sob-facts">
          <div><dt>{s("facts.asOf")}</dt><dd>{asOf}</dd></div>
          <div><dt>{s("facts.scope")}</dt><dd>{s("facts.scopeVal", { n: meta.scope.countries_in_scope, total: SCOPE_COUNTRIES })}</dd></div>
          <div><dt>{s("facts.version")}</dt><dd>{snapshot.version}{selectedVersion ? ` · ${im("historical")}` : ` · ${im("current")}`}</dd></div>
        </dl>
        <form method="get" className="sob-version-form">
          <label htmlFor="sob-version">{s("facts.version")}</label>
          <select id="sob-version" name="version" defaultValue={selectedVersion ?? ""} className="ed-input">
            <option value="">{locale === "fr" ? "Dernière version publiée" : locale === "es" ? "Última versión publicada" : "Latest published version"}</option>
            {versions.map(v => <option key={v.provider_version} value={v.provider_version}>{v.provider_version}{v.as_of_date ? ` — ${v.as_of_date}` : ""}</option>)}
          </select>
          <button type="submit" className="ed-btn ed-btn-dark">{locale === "fr" ? "Consulter cette version" : locale === "es" ? "Ver esta versión" : "View this version"}</button>
          <CopyLink label={im("copyLink")} done={im("copied")} />
        </form>
        <p className="im-p" style={{ fontSize: "0.9375rem", maxWidth: "52rem" }}>{s("diaspora")} <Link href="/data-sources" className="im-link">{s("methodLink")}</Link></p>
        {freshness.stale && <p className="ed-note" role="note">{s("stale", { date: asOf })}</p>}
        {origin === "fallback" && <p className="ed-note" role="note">{s("fallback")}</p>}
      </section>

      {/* Scène 02 · Les chiffres : un indicateur dominant, puis les autres, valeurs de la version consultée */}
      <section id="sob-numbers" className="im im-ink im-pad sob-numbers" aria-labelledby="sob-headline">
        <p className="im-ey im-rv">{im("numbersEyebrow")}</p>
        <div className="im-grid" style={{ rowGap: "2.5rem", alignItems: "end", marginTop: "2rem" }}>
          <h2 id="sob-headline" className="im-t im-rv im-t8 sob-big" style={{ gridColumn: "1 / span 8" }}>
            <AnimatedNumber value={headline.devs_active_28d} locale={loc} />
          </h2>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "9 / span 4", fontSize: "1.1875rem", color: "var(--bg)" }}>
            {t("hero.captionStart")} <b>{nf.format(headline.ecosystems)}</b> {t("hero.captionMid")} <b>{nf.format(headline.cities)}</b> {t("hero.captionMid2")} {t("hero.captionEmEnd")}
          </p>
        </div>
        <div className="im-grid sob-kpis">
          {[
            { v: headline.countries, label: t("hero.stat2Sub") },
            { v: headline.cities, label: im("cities") },
            { v: headline.ecosystems, label: t("hero.stat3Sub") },
            { v: headline.commits_lifetime, label: (await getTranslations({ locale, namespace: "Site.home" }))("kpi.commits") },
          ].map((k, i) => (
            <div key={i} className="im-rv im-rule im-t8" style={{ gridColumn: "span 3", borderColor: i === 0 ? "var(--accent-light)" : undefined }}>
              <AnimatedNumber value={k.v} locale={loc} className="im-t" style={{ display: "block", fontSize: "clamp(2.5rem, 4vw, 4.75rem)" }} />
              <p className="im-p" style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>{k.label}</p>
            </div>
          ))}
        </div>
        <p className="im-p" style={{ marginTop: "2.5rem", fontSize: "0.9375rem" }}>{s("updated")} {im("observed")}</p>
      </section>

      {/* Scène 07 · Historique : écarts avec la version précédente et tendance de toutes les versions */}
      <section id="sob-history" className="im im-pad sob-history" aria-labelledby="sob-history-title">
        <div className="im-grid" style={{ rowGap: "1.5rem", marginBottom: "clamp(2rem, 5vh, 3.5rem)", alignItems: "end" }}>
          <h2 id="sob-history-title" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 6" }}>{im("historyTitle")}</h2>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "8 / span 5" }}>{im("historyIntro")}</p>
        </div>
        <div className="im-grid" style={{ rowGap: "3rem" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 6", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 className="im-ey">{locale === "fr" ? "Évolution depuis la version précédente" : locale === "es" ? "Cambios desde la versión anterior" : "Changes since previous version"}</h3>
            {deltas.length > 0 ? (
              <DeltaBars
                deltas={deltas}
                locale={loc}
                labels={{
                  metric: locale === "fr" ? "Indicateur" : locale === "es" ? "Indicador" : "Metric",
                  previous: locale === "fr" ? "Avant" : locale === "es" ? "Antes" : "Previous",
                  current: locale === "fr" ? "Actuel" : locale === "es" ? "Actual" : "Current",
                  change: locale === "fr" ? "Écart" : locale === "es" ? "Diferencia" : "Difference",
                  added: im("deltaAdded"),
                  removed: im("deltaRemoved"),
                  unknown: im("deltaUnknown"),
                  caption: im("deltaCaption"),
                }}
              />
            ) : (
              <p className="im-p">{im("deltaNone")}</p>
            )}
            <p className="im-p" style={{ fontSize: "0.875rem" }}>{im("deltaNote")}</p>
          </div>
          <div className="im-rv im-t8" style={{ gridColumn: "8 / span 5", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 className="im-ey">{s("trendTitle")}</h3>
            <SobTrend points={trend} locale={loc} label={s("trendLabel")} emptyNote={s("trendEmpty")} />
            {trend.length > 1 && <p className="im-p" style={{ fontSize: "0.875rem" }}>{im("trendPeriod", { from: trend[0].as_of_date, to: trend[trend.length - 1].as_of_date })}</p>}
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
            {selectedVersion && <p className="ed-note" role="note">{im("analysisVersionNote")}</p>}
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
      <div id="sob-explore" className="sob-sticky-filters">
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
                <div key={c.city} className="sob-city-row im-rv">
                  <div className="sob-city-rank">{String(c.rank).padStart(2, "0")}</div>
                  <div className="sob-city-name">{c.city}<em>{c.country}</em></div>
                  <div
                    className="sob-city-bar im-bar"
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
