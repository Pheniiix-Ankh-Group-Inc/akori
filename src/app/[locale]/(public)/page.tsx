import { localizeSnapshot } from "@/lib/geo/names"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { getPublishedEvents } from "@/lib/events/queries"
import { splitByTiming } from "@/lib/events/temporal"
import { getPublishedStories } from "@/lib/stories/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import { isSobAvailable, loadSobState } from "@/lib/sob/load"
import { visual } from "@/lib/editorial/visuals"
import { NewsletterForm } from "@/components/newsletter/NewsletterForm"
import { EditorialImage } from "@/components/ui/EditorialImage"
import { FOUNDERS } from "@/components/about/FounderProfile"
import { AxesScrolly, type Axis } from "@/components/home/AxesScrolly"
import { EventIndex } from "@/components/home/EventIndex"

// Keep the homepage current during brief upstream outages and recoveries;
// verified State of BIB data itself still uses its protected 15-minute cache.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Meta" })
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description"), type: "website" },
  }
}

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M3 9h12M10 4l5 5-5 5" />
  </svg>
)

/**
 * Accueil « Immersive Spatial Institution » : douze chapitres bord à bord
 * (maquette Claude Design, canvas NHuFujNijWL4pZUGFL2cWN, page Phase 3).
 * Le cinéma plein cadre ouvre et ferme le parcours (hero, State of BIB,
 * newsletter), la galerie spatiale porte les récits (mission, axes,
 * fondateurs, Spotlight, BIB en action), l'index sert la consultation
 * (événements, ressources).
 *
 * Contenus réels uniquement : textes validés, événements et rétrospectives
 * publiés dans Supabase, chiffres du dernier instantané State of BIB. Un
 * chapitre sans contenu affiche son état vide, jamais un contenu inventé.
 * Les photos viennent du catalogue src/lib/editorial/visuals.ts ; un visuel
 * non validé n'est pas affiché.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const [im, hero, manifesto, tn, ti, tia, sp, home, ta, hb] = await Promise.all([
    getTranslations({ locale, namespace: "Immersive" }),
    getTranslations({ locale, namespace: "Hero" }),
    getTranslations({ locale, namespace: "Manifesto" }),
    getTranslations({ locale, namespace: "Newsletter" }),
    getTranslations({ locale, namespace: "Institutional" }),
    getTranslations({ locale, namespace: "InAction" }),
    getTranslations({ locale, namespace: "Spotlight" }),
    getTranslations({ locale, namespace: "Site.home" }),
    getTranslations({ locale, namespace: "Site.about" }),
    getTranslations({ locale, namespace: "HomeBlocks" }),
  ])
  const [{ events }, { stories, media }, sob] = await Promise.all([getPublishedEvents(), getPublishedStories(), loadSobState()])
  const { upcoming, ongoing } = splitByTiming(events)
  const nextEvents = [...ongoing, ...upcoming].slice(0, 4)
  const views = toPublicMediaViews(media, locale)
  const latestStories = stories.slice(0, 3)
  const nf = new Intl.NumberFormat(intlLocale(locale))

  // State of BIB : aucun chiffre sans version valide.
  const sobOk = isSobAvailable(sob)
  const h = sobOk ? sob.headline : null
  const countries = sobOk ? [...localizeSnapshot(sob, locale).countryMap].sort((a, b) => b.devs_active_28d - a.devs_active_28d) : []
  const topCountries = countries.slice(0, 6)
  const countryMax = Math.max(1, ...topCountries.map((c) => c.devs_active_28d))
  const firstCaribbean = countries.find((c) => c.region === "Caribbean")
  const sobDate = h ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${h.snapshot_date}T00:00:00Z`)) : ""
  const topShare = h && topCountries[0] ? Math.round((topCountries[0].devs_active_28d / h.devs_active_28d) * 100) : null

  const founders = await Promise.all(
    FOUNDERS.map(async (f) => {
      const ft = await getTranslations({ locale, namespace: f.ns })
      return { ...f, name: ft("name"), role: ft("role") }
    }),
  )

  // Images des axes : catalogue validé seulement ; sans image, un grand numéro.
  const vt = await getTranslations({ locale, namespace: "Visuals" })
  const withAlt = (key: "events" | "newsletter" | "sob" | "home") => {
    const v = visual(key)
    return v ? { src: v.desktop.src, alt: vt(key), focus: v.focus } : null
  }
  const axes: Axis[] = [
    { key: "meet", title: ti("about.meetTitle"), text: ti("about.meetText"), link: ti("about.meetLink"), href: "/evenements", image: withAlt("events") },
    { key: "learn", title: ti("about.learnTitle"), text: ti("about.learnText"), link: ti("about.learnLink"), href: "/resources", image: withAlt("newsletter") },
    { key: "observe", title: ti("about.observeTitle"), text: ti("about.observeText"), link: ti("about.observeLink"), href: "/state_of_bib", image: withAlt("sob") },
    { key: "highlight", title: ti("mission.highlightTitle"), text: ti("mission.highlightText"), link: im("axes.spotlightLink"), href: "/startup-spotlight", image: null },
  ]
  const pillars = ["connect", "share", "highlight"] as const
  const spotlightPillars = ["p1", "p2", "p3"] as const
  const resources = [
    { cat: im("resources.catMethod"), title: ti("resources.sourcesTitle"), text: ti("resources.sourcesText"), href: "/data-sources" },
    { cat: im("resources.catCommunity"), title: ti("resources.eventsTitle"), text: ti("resources.eventsText"), href: "/evenements" },
    { cat: im("resources.catCollective"), title: ti("resources.peopleTitle"), text: ti("resources.peopleText"), href: "/fondateurs" },
  ]

  return (
    <main className="im">
      {/* 01 · Hero : photo plein cadre, titre sur la zone calme, une action */}
      <section className="im-sc im-vh im-hero" aria-labelledby="home-hero">
        <div className="im-hero-media im-hz" style={{ overflow: "hidden" }}>
          <EditorialImage name="about" locale={locale} ratio="fill" sizes="100vw" priority />
        </div>
        <div className="im-hero-copy im-pad im-hzt">
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 2.5vh, 1.75rem)" }}>
            <p className="im-ey">{im("hero.eyebrow")}</p>
            <h1 id="home-hero" className="im-t im-display">
              <span className="im-line">
                <span>
                  Black <em>in</em>
                </span>
              </span>
              <span className="im-line">
                <span>Blockchain.</span>
              </span>
            </h1>
          </div>
          <div className="im-hero-low" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "1.75rem 4rem" }}>
            <p className="im-p" style={{ color: "var(--bg)", fontSize: "1.1875rem", maxWidth: "33rem" }}>{hero("lede")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.75rem" }}>
              <Link href="/#evenements" className="ed-btn im-btn-lt" style={{ gap: "0.9rem", minHeight: 52 }}>
                {home("ctaEvents")}
                <Arrow />
              </Link>
              <Link href="/#manifeste" className="im-link" style={{ color: "var(--bg)" }}>{im("hero.secondary")}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 02 · Manifeste : respiration typographique */}
      <section id="manifeste" className="im-sc im-vh im-man im-pad" aria-labelledby="home-manifesto" style={{ paddingTop: "clamp(6rem, 16vh, 12.5rem)", paddingBottom: "clamp(4rem, 10vh, 9rem)", boxSizing: "border-box" }}>
        <div className="im-grid" style={{ rowGap: "clamp(2.5rem, 8vh, 6rem)" }}>
          <p className="im-ey im-rv im-t8" style={{ gridColumn: "1 / span 2" }}>{im("manifesto.eyebrow")}</p>
          <h2 id="home-manifesto" className="im-t im-rv im-t8" style={{ gridColumn: "3 / span 9", fontSize: "clamp(2.4rem, 5.2vw, 6.25rem)", lineHeight: 1.04 }} dangerouslySetInnerHTML={{ __html: manifesto.raw("quote") as string }} />
          <div className="im-rv im-t8" style={{ gridColumn: "8 / span 4", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <p className="im-p">{ti("mission.intro")}</p>
            <Link href="/mission" className="im-link" style={{ alignSelf: "flex-start" }}>{home("readMission")}</Link>
          </div>
        </div>
      </section>

      {/* 03 · À propos et mission : image dominante, texte sur un autre plan */}
      <section id="a-propos" className="im-sc im-sand" aria-labelledby="home-mission" style={{ paddingBottom: "clamp(5rem, 14vh, 12.5rem)" }}>
        <div className="im-mission">
          <div className="im-mission-media im-mk im-px" style={{ position: "relative", overflow: "hidden" }}>
            <EditorialImage name="home" locale={locale} ratio="fill" sizes="(max-width: 1279px) 100vw, 58vw" />
          </div>
          <div className="im-mission-copy im-rv">
            <p className="im-ey">{im("mission.eyebrow")}</p>
            <h2 id="home-mission" className="im-t im-h2s">{ti("about.approachTitle")}</h2>
            <p className="im-p">{ti("about.intro")}</p>
            <p className="im-p">{ti("about.approachText")}</p>
            <Link href="/about" className="im-link" style={{ alignSelf: "flex-start" }}>{ti("about.missionLink")}</Link>
          </div>
        </div>
        <div className="im-pad im-grid" style={{ rowGap: "2rem", marginTop: "clamp(3rem, 8vh, 6rem)" }}>
          <p className="im-ey im-t8 im-rv" style={{ gridColumn: "1 / span 3" }}>{im("mission.pillars")}</p>
          {pillars.map((p, i) => (
            <div key={p} className="im-rv im-rule im-t8" style={{ gridColumn: `${4 + i * 3} / span 3` }}>
              <h3 className="im-t" style={{ fontSize: "1.875rem" }}>{ti(`mission.${p}Title`)}</h3>
              <p className="im-p" style={{ marginTop: "0.6rem", fontSize: "1rem" }}>{ti(`mission.${p}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 04 · Ce que nous construisons : défilement collant */}
      <section id="ce-que-nous-faisons" className="im-sc" aria-labelledby="home-axes" style={{ overflow: "visible" }}>
        <AxesScrolly axes={axes} eyebrow={im("axes.eyebrow")} heading={im("axes.title")} />
      </section>

      {/* 05 · Fondateurs : vrais portraits, hauteurs décalées */}
      <section id="fondateurs" className="im-sc im-sand im-pad" aria-labelledby="home-founders" style={{ paddingTop: "clamp(6rem, 14vh, 11rem)", paddingBottom: "clamp(6rem, 16vh, 13rem)" }}>
        <div className="im-grid" style={{ rowGap: "3.5rem", alignItems: "start" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 4", display: "flex", flexDirection: "column", gap: "1.4rem" }}>
            <p className="im-ey">{im("founders.eyebrow")}</p>
            <h2 id="home-founders" className="im-t im-h2s">{im("founders.title")}</h2>
            <Link href="/fondateurs" className="im-link" style={{ alignSelf: "flex-start" }}>{ti("about.foundersLink")}</Link>
          </div>
          {founders.map((f, i) => (
            <article key={f.slug} className={i === 0 ? "im-fa" : "im-fa im-fb im-founder-b"} style={{ gridColumn: i === 0 ? "5 / span 4" : "9 / span 4", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div className={`im-img im-mk ${i === 0 ? "im-px" : ""}`} style={{ aspectRatio: "2 / 3" }}>
                <Image src={f.image} alt={f.name} fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 30vw" style={{ objectFit: "cover", objectPosition: "50% 22%" }} />
              </div>
              <h3 className="im-t" style={{ fontSize: "2.125rem" }}>
                <Link href={`/fondateurs/${f.slug}`}>{f.name}</Link>
              </h3>
              <p className="im-p" style={{ fontSize: "1rem" }}>{f.role}</p>
              <Link href={`/fondateurs/${f.slug}`} className="im-link" style={{ alignSelf: "flex-start" }}>{ta("readProfile")}</Link>
            </article>
          ))}
        </div>
      </section>

      {/* 06 · Événements : index éditorial */}
      <section id="evenements" className="im-sc im-pad" aria-labelledby="home-events" style={{ paddingTop: "clamp(5.5rem, 12vh, 10rem)", paddingBottom: "clamp(5rem, 12vh, 10rem)" }}>
        <div className="im-grid" style={{ rowGap: "1.75rem", alignItems: "end", marginBottom: "clamp(2.5rem, 6vh, 4.5rem)" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 7", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <p className="im-ey">{im("events.eyebrow")}</p>
            <h2 id="home-events" className="im-t im-h2">{im("events.title")}</h2>
          </div>
          <div className="im-rv im-t8" style={{ gridColumn: "9 / span 4", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <p className="im-p">{im("events.intro")}</p>
            <Link href="/evenements" className="im-link" style={{ alignSelf: "flex-start" }}>{home("eventsCalendar")}</Link>
          </div>
        </div>
        {nextEvents.length === 0 ? (
          <div className="im-rule im-rv" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "1rem 2rem", paddingTop: "1.5rem" }}>
            <p className="im-t" style={{ fontSize: "clamp(1.5rem, 2vw, 2.125rem)", maxWidth: "48rem", lineHeight: 1.25 }}>{im("events.empty")}</p>
            <Link href="/#newsletter" className="im-link">{im("events.emptyLink")}</Link>
          </div>
        ) : (
          <EventIndex events={nextEvents} locale={locale} />
        )}
      </section>

      {/* 07 · Startup Spotlight : programme réel, premier portrait en préparation */}
      <section id="spotlight" className="im-sc im-sand" aria-labelledby="home-spotlight">
        <div className="im-grid" style={{ minHeight: "min(100svh, 62rem)" }}>
          <div className="im-t8 im-dt" style={{ gridColumn: "1 / span 5", background: "var(--blanc)", color: "var(--bg)", display: "flex", alignItems: "flex-end", padding: "var(--im-pad)", boxSizing: "border-box" }}>
            <p className="im-t im-mk" style={{ fontSize: "clamp(4rem, 9vw, 10rem)", lineHeight: 0.9 }}>
              Startup <em style={{ color: "var(--accent-light)" }}>Spotlight</em>
            </p>
          </div>
          <div className="im-t8 im-sp-copy" style={{ gridColumn: "7 / span 6", paddingTop: "clamp(4rem, 14vh, 10rem)", paddingBottom: "clamp(4rem, 10vh, 8rem)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <p className="im-ey im-rv">{im("spotlight.eyebrow")}</p>
            <h2 id="home-spotlight" className="im-t im-h2s im-rv">{sp("hero.tagline")}</h2>
            <p className="im-p im-rv">{sp("hero.lede")}</p>
            <div className="im-rv" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "1.25rem", maxWidth: "40rem" }}>
              {spotlightPillars.map((k) => (
                <div key={k} className="im-rule">
                  <p style={{ margin: 0, fontWeight: 500, fontSize: "0.9375rem" }}>{sp(`hero.pillars.${k}.t`)}</p>
                  <p className="im-p" style={{ marginTop: "0.25rem", fontSize: "0.875rem" }}>{sp(`hero.pillars.${k}.d`)}</p>
                </div>
              ))}
            </div>
            <p className="im-rv" style={{ margin: 0, padding: "1rem 1.1rem", background: "var(--bg)", fontSize: "0.9375rem", maxWidth: "38rem" }}>{sp("status.hero")}</p>
            <Link href="/startup-spotlight" className="im-link im-rv" style={{ alignSelf: "flex-start" }}>{im("spotlight.link")}</Link>
          </div>
        </div>
      </section>

      {/* 08 · State of BIB : récit de données sur encre */}
      <section id="state-of-bib" className="im-sc im-ink" aria-labelledby="home-sob">
        <div className="im-vh" style={{ position: "relative", display: "flex", alignItems: "flex-start" }}>
          <div className="im-px" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <EditorialImage name="sob" locale={locale} ratio="fill" sizes="100vw" />
          </div>
          <div className="im-pad im-rv im-sob-intro" style={{ position: "relative", paddingTop: "18vh", maxWidth: "62rem", display: "flex", flexDirection: "column", gap: "1.4rem" }}>
            <p className="im-ey">{im("sob.eyebrow")}</p>
            <h2 id="home-sob" className="im-t im-h2">{im("sob.title")}</h2>
            <p className="im-p" style={{ color: "#E9E3D8" }}>{im("sob.intro")}</p>
          </div>
        </div>
        {h ? (
          <>
            <div className="im-pad im-grid" style={{ paddingTop: "clamp(6rem, 16vh, 12.5rem)", rowGap: "3rem", alignItems: "end" }}>
              <p className="im-t im-figure-num im-rv im-t8" style={{ gridColumn: "1 / span 7" }}>{nf.format(h.devs_active_28d)}</p>
              <div className="im-rv im-t8" style={{ gridColumn: "8 / span 4", display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "2vw" }}>
                <p style={{ margin: 0, fontSize: "1.1875rem" }}>{im("sob.mainLabel")}</p>
                <p className="im-p" style={{ fontSize: "0.9375rem" }}>{im("sob.mainNote", { date: sobDate })}</p>
              </div>
            </div>
            <div className="im-pad im-grid" style={{ paddingTop: "clamp(4.5rem, 12vh, 10rem)", rowGap: "2.5rem" }}>
              {[
                { v: h.countries, k: "countries", col: "1 / span 3" },
                { v: h.cities, k: "cities", col: "4 / span 3" },
                { v: h.commits_lifetime, k: "commits", col: "7 / span 6" },
              ].map((m, i) => (
                <div key={m.k} className="im-rv im-rule im-t8" style={{ gridColumn: m.col, borderColor: i === 0 ? "var(--accent-light)" : undefined }}>
                  <p className="im-t" style={{ fontSize: "clamp(2.75rem, 4vw, 4.5rem)" }}>{nf.format(m.v)}</p>
                  <p className="im-p" style={{ marginTop: "0.5rem", fontSize: "0.9375rem" }}>{im(`sob.${m.k}`)}</p>
                </div>
              ))}
            </div>
            <div className="im-pad im-grid" style={{ paddingTop: "clamp(4.5rem, 12vh, 10rem)", paddingBottom: "clamp(6rem, 16vh, 12.5rem)", rowGap: "3rem" }}>
              <figure className="im-rv im-t8" style={{ gridColumn: "1 / span 7", margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                <figcaption className="im-ey">{im("sob.chartTitle")}</figcaption>
                <table className="im-bars">
                  <caption className="sr-only">{im("sob.chartCaption")}</caption>
                  <tbody>
                    {topCountries.map((c) => (
                      <tr key={c.iso_a3}>
                        <th scope="row">{c.name}</th>
                        <td>
                          <span className="im-bar" style={{ width: `${((c.devs_active_28d / countryMax) * 100).toFixed(1)}%` }} aria-hidden="true" />
                        </td>
                        <td>{nf.format(c.devs_active_28d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </figure>
              <div className="im-rv im-t8" style={{ gridColumn: "9 / span 4", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <p className="im-ey">{im("sob.analysisTitle")}</p>
                {topShare !== null && topCountries[0] && (
                  <p style={{ margin: 0, fontSize: "1.1875rem", lineHeight: 1.55 }}>
                    {im("sob.analysis", { country: topCountries[0].name, share: topShare })}
                    {firstCaribbean && <> {im("sob.analysisCaribbean", { country: firstCaribbean.name, count: nf.format(firstCaribbean.devs_active_28d) })}</>}
                  </p>
                )}
                <p className="im-p" style={{ fontSize: "0.875rem" }}>{im("sob.source", { date: sobDate })} {home("sobScope")}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center" }}>
                  <Link href="/state_of_bib" className="ed-btn im-btn-lt">{home("ctaSob")}</Link>
                  <Link href="/data-sources" className="im-link" style={{ color: "var(--accent-light)" }}>{im("sob.methodLink")}</Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="im-pad" style={{ paddingBlock: "4rem 8rem" }}>
            <p className="im-p" role="status">{hb("sobUnavailable")}</p>
          </div>
        )}
      </section>

      {/* 09 · BIB en action : vraies rétrospectives ; sinon un état vide sobre */}
      <section id="en-action" className="im-sc im-pad" aria-labelledby="home-in-action" style={{ paddingTop: "clamp(6rem, 14vh, 11rem)", paddingBottom: "clamp(5rem, 12vh, 10rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem", alignItems: "start" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 5", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p className="im-ey">{im("action.eyebrow")}</p>
            <h2 id="home-in-action" className="im-t im-h2s">{im("action.title")}</h2>
            <p className="im-p">{tia("intro")}</p>
          </div>
          {latestStories.length === 0 ? (
            <div className="im-rv im-rule im-t8" style={{ gridColumn: "7 / span 6", display: "flex", flexDirection: "column", gap: "0.9rem", paddingTop: "1.25rem" }}>
              <p className="im-t" style={{ fontSize: "clamp(1.6rem, 2.2vw, 2.5rem)", lineHeight: 1.2 }}>{tia("empty")}</p>
              <p className="im-p" style={{ fontSize: "1rem" }}>{im("action.emptyText")}</p>
              <Link href="/#evenements" className="im-link" style={{ alignSelf: "flex-start" }}>{ti("about.meetLink")}</Link>
            </div>
          ) : (
            latestStories.map((s, i) => {
              const tr = pickTranslation(s.story_translations, locale)
              const cover = s.cover_media_id ? views[s.cover_media_id] : undefined
              const col = ["7 / span 6", "1 / span 5", "7 / span 5"][i] ?? "1 / span 6"
              return (
                <Link key={s.id} href={`/en-action/${s.slug}`} className="im-rv im-t8" style={{ gridColumn: col, display: "flex", flexDirection: "column", gap: "0.9rem", marginTop: i === 2 ? "8rem" : undefined }}>
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
                    <img src={cover.url} alt={cover.alt} loading="lazy" style={{ width: "100%", aspectRatio: i === 0 ? "3 / 2" : "4 / 3", objectFit: "cover" }} />
                  )}
                  <span className="im-t" style={{ fontSize: "clamp(1.5rem, 2vw, 2.25rem)" }}>{tr?.value.title ?? s.slug}</span>
                  {tr?.value.summary && <span className="im-p" style={{ fontSize: "1rem" }}>{tr.value.summary}</span>}
                  <span className="im-link">{tia("viewStory")}</span>
                </Link>
              )
            })
          )}
        </div>
      </section>

      {/* 10 · Ressources : index éditorial */}
      <section id="ressources" className="im-sc im-sand im-pad" aria-labelledby="home-resources" style={{ paddingTop: "clamp(6rem, 14vh, 11rem)", paddingBottom: "clamp(5rem, 12vh, 10rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem", alignItems: "end", marginBottom: "clamp(2.5rem, 6vh, 4.5rem)" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 6", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <p className="im-ey">{im("resources.eyebrow")}</p>
            <h2 id="home-resources" className="im-t im-h2s">{ti("resources.exploreTitle")}</h2>
          </div>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "8 / span 5" }}>{ti("resources.intro")}</p>
        </div>
        <Link href="/state_of_bib" className="im-grid im-rv" style={{ borderTop: "1px solid var(--blanc)", padding: "1.75rem 0", rowGap: "0.6rem", alignItems: "baseline" }}>
          <span className="im-ey im-t8" style={{ gridColumn: "1 / span 3" }}>{im("resources.featured")}</span>
          <span className="im-t im-t8" style={{ gridColumn: "4 / span 4", fontSize: "clamp(2rem, 3vw, 3.5rem)" }}>{ti("resources.stateTitle")}</span>
          <span className="im-p im-t8" style={{ gridColumn: "8 / span 4", fontSize: "1rem" }}>{ti("resources.stateText")}</span>
          <span className="im-dt" style={{ gridColumn: "12", justifySelf: "end", fontSize: "1.75rem" }} aria-hidden="true">→</span>
        </Link>
        <ul className="im-index">
          {resources.map((r) => (
            <li key={r.href} className="im-rv">
              <Link href={r.href} className="im-grid" style={{ padding: "1.4rem 0", rowGap: "0.4rem", alignItems: "baseline" }}>
                <span className="im-ey im-t8" style={{ gridColumn: "1 / span 3" }}>{r.cat}</span>
                <span className="im-t im-t8" style={{ gridColumn: "4 / span 4", fontSize: "clamp(1.5rem, 1.8vw, 2rem)" }}>{r.title}</span>
                <span className="im-p im-t8" style={{ gridColumn: "8 / span 4", fontSize: "1rem" }}>{r.text}</span>
                <span className="im-dt" style={{ gridColumn: "12", justifySelf: "end", fontSize: "0.9375rem" }}>{im("resources.open")}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="im-p im-rv" style={{ marginTop: "1.75rem", maxWidth: "48rem", fontSize: "0.9375rem" }}>
          {ti("resources.futureText")} <Link href="/#newsletter" className="im-link">{ti("resources.newsletterLink")}</Link>
        </p>
      </section>

      {/* 11 · Newsletter : clôture sur l'horizon (même photo que le hero, autre cadrage) */}
      <section id="newsletter" className="im-sc im-vh" aria-labelledby="home-newsletter" style={{ display: "flex", alignItems: "flex-start", background: "#9AA6AE" }}>
        <div className="im-px" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <EditorialImage name="about" locale={locale} ratio="fill" sizes="100vw" />
        </div>
        <div className="im-pad im-grid" style={{ position: "relative", width: "100%", boxSizing: "border-box", paddingTop: "14vh", paddingBottom: "10vh", rowGap: "2rem", alignItems: "end" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 6", display: "flex", flexDirection: "column", gap: "1.25rem", alignSelf: "start" }}>
            <p className="im-ey" style={{ color: "var(--blanc)" }}>{im("newsletter.eyebrow")}</p>
            <h2 id="home-newsletter" className="im-t im-h2s">{im("newsletter.title")}</h2>
            <p className="im-p" style={{ color: "var(--blanc)" }}>{tn("intro")}</p>
          </div>
          <div className="im-nl-form im-rv im-t8" style={{ gridColumn: "8 / span 5" }}>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  )
}
