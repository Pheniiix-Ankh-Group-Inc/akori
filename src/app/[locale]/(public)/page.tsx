import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedEvents } from "@/lib/events/queries"
import { splitByTiming } from "@/lib/events/temporal"
import { getPublishedStories } from "@/lib/stories/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import { loadSobSnapshot } from "@/lib/sob/load"
import { EventCard } from "@/components/events/EventCard"
import { NewsletterForm } from "@/components/newsletter/NewsletterForm"

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

const RUBRICS = ["blockchain_insights", "blockchain_news", "bib_events", "bib_highlights"] as const
const EXPLORE = [
  { key: "events", href: "/evenements" },
  { key: "inAction", href: "/en-action" },
  { key: "sob", href: "/state_of_bib" },
  { key: "newsletter", href: "/#newsletter" },
] as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Meta" })
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description"), type: "website" },
  }
}

/**
 * Accueil (charte éditoriale). Uniquement des contenus réels : textes
 * validés, événements et rétrospectives publiés dans Supabase, chiffres du
 * dernier instantané State of BIB. Un bloc sans contenu n'est pas affiché.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, hero, manifesto, tn, hb] = await Promise.all([
    getTranslations({ locale, namespace: "Site.home" }),
    getTranslations({ locale, namespace: "Hero" }),
    getTranslations({ locale, namespace: "Manifesto" }),
    getTranslations({ locale, namespace: "Newsletter" }),
    getTranslations({ locale, namespace: "HomeBlocks" }),
  ])
  const [{ events }, { stories, media }, sob] = await Promise.all([getPublishedEvents(), getPublishedStories(), loadSobSnapshot()])
  const { upcoming, ongoing } = splitByTiming(events)
  const nextEvents = [...ongoing, ...upcoming].slice(0, 3)
  const views = toPublicMediaViews(media, locale)
  const latestStories = stories.slice(0, 3)
  const nf = new Intl.NumberFormat(intlLocale(locale))
  const h = sob.headline
  const kpis = [
    { v: h.devs_active_28d, k: "devs" },
    { v: h.ecosystems, k: "ecosystems" },
    { v: h.countries, k: "countries" },
    { v: h.cities, k: "cities" },
    { v: h.commits_lifetime, k: "commits" },
  ] as const

  return (
    <main>
      {/* Hero */}
      <section className="ed-wrap" style={{ paddingTop: "7rem", paddingBottom: "6rem" }}>
        <div className="ed-stack" style={{ maxWidth: "56rem", gap: "1.75rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-display">
            Black <em>in</em> Blockchain
          </h1>
          <p className="ed-lede">{hero("lede")}</p>
          <div className="ed-row" style={{ gap: "0.75rem" }}>
            <Link href="/evenements" className="ed-btn ed-btn-dark">{t("ctaEvents")}</Link>
            <Link href="/state_of_bib" className="ed-btn ed-btn-line">{t("ctaSob")}</Link>
          </div>
        </div>
      </section>

      {/* Prémisse */}
      <section className="ed-section ed-section-white" aria-labelledby="home-premise">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.5rem" }}>
          <h2 id="home-premise" className="ed-eyebrow">{t("premise")}</h2>
          <p className="ed-quote" dangerouslySetInnerHTML={{ __html: manifesto.raw("quote") as string }} />
          <Link href="/fondateurs" className="ed-link">{(await getTranslations({ locale, namespace: "Site.nav" }))("about")} →</Link>
        </div>
      </section>

      {/* Explorer BIB */}
      <section className="ed-section" aria-labelledby="home-explore">
        <div className="ed-wrap">
          <h2 id="home-explore" className="ed-h2" style={{ marginBottom: "2rem" }}>{t("exploreTitle")}</h2>
          <div className="ed-grid-4">
            {EXPLORE.map((x, i) => (
              <Link key={x.key} href={x.href} className="ed-card">
                <div className="ed-card-body">
                  <span className="ed-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ed-h3">{t(`explore.${x.key}.title`)}</span>
                  <span className="text-sm">{t(`explore.${x.key}.desc`)}</span>
                  <span className="ed-link" style={{ marginTop: "auto" }} aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Événements à venir */}
      <section className="ed-section ed-section-white" aria-labelledby="home-events">
        <div className="ed-wrap">
          <div className="ed-head-row">
            <h2 id="home-events" className="ed-h2">{hb("eventsTitle")}</h2>
            <Link href="/evenements" className="ed-link">{hb("eventsAll")} →</Link>
          </div>
          {nextEvents.length === 0 ? (
            <p className="ed-note">{t("noEvents")}</p>
          ) : (
            <div className="ed-grid">
              {nextEvents.map((e) => <EventCard key={e.id} event={e} locale={locale} />)}
            </div>
          )}
        </div>
      </section>

      {/* BIB en action — seulement s'il y a des rétrospectives publiées */}
      {latestStories.length > 0 && (
        <section className="ed-section" aria-labelledby="home-in-action">
          <div className="ed-wrap">
            <div className="ed-head-row">
              <h2 id="home-in-action" className="ed-h2">{hb("inActionTitle")}</h2>
              <Link href="/en-action" className="ed-link">{hb("inActionAll")} →</Link>
            </div>
            <div className="ed-grid">
              {latestStories.map((s) => {
                const tr = pickTranslation(s.story_translations, locale)
                const cover = s.cover_media_id ? views[s.cover_media_id] : undefined
                return (
                  <Link key={s.id} href={`/en-action/${s.slug}`} className="ed-card">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
                      <img className="ed-card-media" src={cover.url} alt={cover.alt} loading="lazy" />
                    )}
                    <div className="ed-card-body">
                      <span className="ed-h3">{tr?.value.title ?? s.slug}</span>
                      {tr?.value.summary && <span className="text-sm">{tr.value.summary}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* State of BIB — chiffres du dernier instantané */}
      <section className="ed-section ed-section-white" aria-labelledby="home-sob">
        <div className="ed-wrap">
          <div className="ed-head-row">
            <h2 id="home-sob" className="ed-h2">{hb("sobTitle")}</h2>
            <Link href="/state_of_bib" className="ed-link">{hb("sobLink")} →</Link>
          </div>
          <div className="ed-stats">
            {kpis.map((k) => (
              <div key={k.k} className="ed-stat">
                <strong>{nf.format(k.v)}</strong>
                <span>{t(`kpi.${k.k}`)}</span>
              </div>
            ))}
          </div>
          <p className="ed-muted" style={{ marginTop: "1.5rem" }}>
            {hb("sobNote", { date: h.snapshot_date, source: sob.meta.source.name, license: sob.meta.source.license })} · {t("sobScope")}
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="ed-section" id="newsletter" aria-labelledby="home-newsletter">
        <div className="ed-wrap ed-split">
          <div className="ed-stack" style={{ gap: "1.25rem" }}>
            <h2 id="home-newsletter" className="ed-h2">{tn("title")}</h2>
            <p className="ed-lede" style={{ fontSize: "1.1rem" }}>{tn("intro")}</p>
            <ul className="ed-list-rows" style={{ marginTop: "0.5rem" }}>
              {RUBRICS.map((r) => (
                <li key={r} style={{ display: "block", padding: "0.9rem 0" }}>
                  <strong style={{ color: "var(--blanc)", fontWeight: 600 }}>{tn(`rubrics.${r}.title`)}</strong>
                  <span className="text-sm" style={{ display: "block" }}>{tn(`rubrics.${r}.desc`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </main>
  )
}
