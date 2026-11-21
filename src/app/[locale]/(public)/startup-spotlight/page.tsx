import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import "./startup-spotlight.css"

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

  return (
    <main className="sp">
      <div className="sp-fiction">
        <div className="sp-fiction-inner">
          <span className="sp-fict">{t("fiction.badge")}</span>
          <span>{t("fiction.text")}</span>
        </div>
      </div>

      {/* A. Hero éditorial */}
      <section aria-labelledby="sp-hero">
        <div className="sp-hero">
          <div className="sp-hero-copy">
            <div className="sp-hero-main">
              <p className="sp-eyebrow">{t("hero.eyebrow")}</p>
              <h1 id="sp-hero" className="sp-title">{t("hero.title")} <em>{t("hero.titleEm")}</em></h1>
              <p className="sp-tagline">{t("hero.tagline")}</p>
              <p className="sp-lede">{t("hero.lede")}</p>
              <div className="sp-cta-row">
                <a className="ed-btn ed-btn-dark" href="#featured">{t("hero.ctaFeatured")}</a>
                <a className="ed-btn ed-btn-line" href="#live">{t("hero.ctaLive")}</a>
              </div>
            </div>
            <ul className="sp-pillars">
              {PILLARS.map((k) => (
                <li key={k}><strong>{t(`hero.pillars.${k}.t`)}</strong><span>{t(`hero.pillars.${k}.d`)}</span></li>
              ))}
            </ul>
          </div>
          <div role="img" aria-label={t("hero.photoAlt")} className="sp-photo sp-hero-photo">{t("hero.photoLabel")}</div>
        </div>
      </section>

      {/* B. Featured Startup */}
      <section id="featured" aria-labelledby="sp-featured" className="sp-band sp-band-white">
        <div className="sp-inner">
          <div className="sp-head">
            <div className="sp-head-text">
              <p className="sp-eyebrow">{t("featured.eyebrow")}</p>
              <h2 id="sp-featured" className="sp-h2">{t("featured.title")}</h2>
            </div>
            <span className="sp-fict">{t("featured.badge")}</span>
          </div>
          <article className="sp-featured">
            <div className="sp-featured-photo">
              <div role="img" aria-label={t("featured.photoAlt")} className="sp-photo sp-ratio-45">{t("featured.photoLabel")}</div>
              <p className="sp-caption">{t("featured.caption")}</p>
            </div>
            <div className="sp-featured-body">
              <div className="sp-brand">
                <div role="img" aria-label={t("featured.logoAlt")} className="sp-photo sp-logo">{t("featured.logo")}</div>
                <span className="sp-brand-name">{t("featured.name")}</span>
              </div>
              <dl className="sp-facts">
                <div><dt>{t("featured.country")}</dt><dd>{t("featured.countryValue")}</dd></div>
                <div><dt>{t("featured.sector")}</dt><dd>{t("featured.sectorValue")}</dd></div>
                <div><dt>{t("featured.stage")}</dt><dd>{t("featured.stageValue")}</dd></div>
              </dl>
              <blockquote className="sp-quote">« <em>{t("featured.quote")}</em> »</blockquote>
              <p className="sp-body">{t("featured.summary")}</p>
              <div className="sp-cta-row sp-cta-center">
                <a className="ed-btn ed-btn-dark" href="#featured">{t("featured.cta")}</a>
                <span className="sp-small">{t("featured.meta")}</span>
              </div>
            </div>
          </article>
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
          <div className="sp-head">
            <h2 id="sp-stories" className="sp-h2">{t("stories.title")}</h2>
            <a className="ed-link" href="#featured">{t("stories.archives")}</a>
          </div>
          <a className="sp-story" href="#featured">
            <div role="img" aria-label={t("stories.photoAlt")} className="sp-photo sp-story-photo">{t("stories.photoLabel")}</div>
            <div className="sp-story-body">
              <span className="sp-muted">{t("stories.meta")}</span>
              <span className="sp-story-title">{t("stories.storyTitle")}</span>
              <span className="sp-story-lede">{t("stories.lede")}</span>
              <span className="sp-story-read">{t("stories.read")}</span>
            </div>
          </a>
        </div>
      </section>

      {/* E. Founder Story Live */}
      <section id="live" aria-labelledby="sp-live" className="sp-live">
        <div className="sp-live-inner">
          <div className="sp-live-copy">
            <p className="sp-eyebrow sp-on-ink">{t("live.eyebrow")}</p>
            <h2 id="sp-live" className="sp-live-title">{t("live.title")} <em>{t("live.titleEm")}</em></h2>
            <p className="sp-live-text">{t("live.text")}</p>
            <p className="sp-live-guests">{t("live.guests")}</p>
          </div>
          <div className="sp-live-box">
            <dl>
              <dt>{t("live.when")}</dt><dd>{t("live.whenValue")}</dd>
              <dt>{t("live.city")}</dt><dd>{t("live.cityValue")}</dd>
              <dt>{t("live.venue")}</dt><dd>{t("live.venueValue")}</dd>
            </dl>
            <Link href="/evenements" className="sp-live-btn">{t("live.cta")}</Link>
            <p className="sp-live-note">{t("live.note")}</p>
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
