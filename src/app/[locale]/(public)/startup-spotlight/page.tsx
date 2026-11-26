import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedEvents } from "@/lib/events/queries"
import { eventText } from "@/lib/events/text"
import { formatSpotlightDate, selectSpotlightEvent } from "@/lib/events/spotlight"
import "./startup-spotlight.css"

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

const PILLARS = ["p1", "p2", "p3"] as const
const PRINCIPLES = ["i1", "i2", "i3", "i4", "i5", "i6"] as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Spotlight.meta" })
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description"), type: "website" },
    // Contenu encore composé d'emplacements fictifs : à ne pas indexer.
    robots: { index: false, follow: false },
  }
}

/**
 * Startup Spotlight — page d'entrée du programme éditorial (maquette « Direction A · Portrait »).
 * Contenu statique : les emplacements entre crochets sont ceux de la maquette.
 */
export default async function StartupSpotlightPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Spotlight" })
  const { events } = await getPublishedEvents()
  const spotlightEvent = selectSpotlightEvent(events, locale)
  const eventDate = spotlightEvent ? formatSpotlightDate(spotlightEvent, locale) : null

  return (
    <main className="sp">
      {/* A. Ouverture cinématographique : titre monumental sur encre, plan photo réservé au futur portrait */}
      <section aria-labelledby="sp-hero" className="sp-cine im">
        <div className="sp-cine-grid">
          <div className="sp-cine-title">
            <p className="im-ey">{t("hero.eyebrow")}</p>
            <h1 id="sp-hero" className="ph-title sp-cine-h1">
              <span className="im-line"><span>{t("hero.title")}</span></span>
              <span className="im-line"><span><em>{t("hero.titleEm")}</em></span></span>
            </h1>
          </div>
          <div className="sp-cine-copy im-rv">
            <p className="sp-cine-tagline">{t("hero.tagline")}</p>
            <p className="im-p">{t("hero.lede")}</p>
            <div className="sp-cta-row">
              <a className="ed-btn im-btn-lt" href="#featured">{t("hero.ctaFeatured")}</a>
              <a className="im-link" href="#live" style={{ color: "var(--accent-light)" }}>{t("hero.ctaLive")}</a>
            </div>
          </div>
          <div role="status" className="sp-cine-await im-mk">
            <span className="im-ey">{t("featured.eyebrow")}</span>
            <p>{t("status.hero")}</p>
          </div>
          <ul className="sp-cine-pillars">
            {PILLARS.map((k, i) => (
              <li key={k} className="im-rv">
                <span className="sp-num">{String(i + 1).padStart(2, "0")}</span>
                <strong>{t(`hero.pillars.${k}.t`)}</strong>
                <span>{t(`hero.pillars.${k}.d`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* B. Featured Startup */}
      <section id="featured" aria-labelledby="sp-featured" className="sp-band sp-band-white">
        <div className="sp-inner">
          <div className="sp-head"><div className="sp-head-text"><p className="sp-eyebrow">{t("featured.eyebrow")}</p><h2 id="sp-featured" className="sp-h2">{t("featured.title")}</h2></div></div>
          <div className="sp-awaiting sp-empty" role="status"><p className="sp-body">{t("status.featured")}</p></div>
        </div>
      </section>

      {/* C. Why We Spotlight */}
      <section aria-labelledby="sp-why" className="sp-band">
        <div className="sp-inner">
          <div className="sp-intro">
            <p className="sp-eyebrow">{t("why.eyebrow")}</p>
            <h2 id="sp-why" className="sp-h2">{t("why.title")} <em>{t("why.titleEm")}</em></h2>
            <p className="sp-body">{t("why.intro")}</p>
          </div>
          <ol className="sp-principles">
            {PRINCIPLES.map((k, i) => (
              <li key={k}>
                <span className="sp-num">{String(i + 1).padStart(2, "0")}</span>
                <strong>{t(`why.items.${k}.t`)}</strong>
                <span>{t(`why.items.${k}.d`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* D. Founder Stories — un seul Spotlight publié */}
      <section aria-labelledby="sp-stories" className="sp-band sp-band-white">
        <div className="sp-inner sp-inner-tight">
          <div className="sp-head"><h2 id="sp-stories" className="sp-h2">{t("stories.title")}</h2></div>
          <p className="sp-body">{t("status.stories")}</p>
        </div>
      </section>

      {/* E. Founder Story Live */}
      <section id="live" aria-labelledby="sp-live" className="sp-live">
        <div className="sp-live-inner">
          <div className="sp-live-copy">
            <p className="sp-eyebrow sp-on-ink">{t("live.eyebrow")}</p>
            <h2 id="sp-live" className="sp-live-title">{t("live.title")} <em>{t("live.titleEm")}</em></h2>
            <p className="sp-live-text">{t("live.text")}</p>
            <p className="sp-live-guests">{spotlightEvent ? eventText(spotlightEvent, locale).title : t("status.guests")}</p>
          </div>
          <div className="sp-live-box">
            <dl>
              <dt>{t("live.when")}</dt><dd>{eventDate ?? t("status.pending")}</dd>
              <dt>{t("live.city")}</dt><dd>{spotlightEvent?.city ?? t("status.pending")}</dd>
              <dt>{t("live.venue")}</dt><dd>{(spotlightEvent?.source_location || spotlightEvent?.venue_name || spotlightEvent?.address || t("status.pending"))}</dd>
            </dl>
            {spotlightEvent ? <Link href={`/evenements/${spotlightEvent.slug}`} className="sp-live-btn">{t("live.cta")}</Link> : <Link href="/evenements" className="sp-live-btn">{t("status.viewEvents")}</Link>}
            <p className="sp-live-note">{spotlightEvent ? t("status.eventDetails") : t("status.noConfirmedEvent")}</p>
          </div>
        </div>
      </section>

      {/* F. Newsletter */}
      <section aria-labelledby="sp-nl" className="sp-band sp-newsletter">
        <div className="sp-nl-inner">
          <div className="sp-nl-text">
            <h2 id="sp-nl" className="sp-h2 sp-h2-sm">{t("newsletter.title")}</h2>
            <p className="sp-body">{t("newsletter.text")}</p>
          </div>
          <Link href="/#newsletter" className="ed-btn ed-btn-dark">{t("newsletter.cta")}</Link>
        </div>
      </section>
    </main>
  )
}
