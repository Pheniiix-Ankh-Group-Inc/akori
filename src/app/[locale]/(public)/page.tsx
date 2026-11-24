import { localizeSnapshot } from "@/lib/geo/names"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedEvents } from "@/lib/events/queries"
import { splitByTiming } from "@/lib/events/temporal"
import { getPublishedStories } from "@/lib/stories/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import { isSobAvailable, loadSobState } from "@/lib/sob/load"
import { EventCard } from "@/components/events/EventCard"
import { NewsletterForm } from "@/components/newsletter/NewsletterForm"
import { EditorialImage, hasVisual } from "@/components/ui/EditorialImage"
import { Reveal } from "@/components/ui/Reveal"
import Image from "next/image"
import { FOUNDERS } from "@/components/about/FounderProfile"

// Keep the homepage current during brief upstream outages and recoveries;
// verified State of BIB data itself still uses its protected 15-minute cache.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ locale: string }> }

const RUBRICS = ["blockchain_insights", "blockchain_news", "bib_events", "bib_highlights"] as const

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
 * Accueil en landing page : une seule page qui enchaîne À propos (#a-propos),
 * Événements (#evenements), BIB en action (#en-action), un aperçu State of BIB
 * (le rapport complet reste sur /state_of_bib) et la newsletter (#newsletter).
 * Les pages de détail (fiches, calendrier, profils) restent accessibles.
 *
 * Charte éditoriale. Uniquement des contenus réels : textes
 * validés, événements et rétrospectives publiés dans Supabase, chiffres du
 * dernier instantané State of BIB. Un bloc sans contenu n'est pas affiché.
 * Direction artistique « Premium Minimalism » : typographie apaisée, filets,
 * visuels éditoriaux (lieux, matières, paysages) affichés seulement une fois
 * déposés en HD (voir src/lib/editorial/visuals.ts).
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, hero, manifesto, tn, hb, marquee, ti, tia] = await Promise.all([
    getTranslations({ locale, namespace: "Site.home" }),
    getTranslations({ locale, namespace: "Hero" }),
    getTranslations({ locale, namespace: "Manifesto" }),
    getTranslations({ locale, namespace: "Newsletter" }),
    getTranslations({ locale, namespace: "HomeBlocks" }),
    getTranslations({ locale, namespace: "Marquee" }),
    getTranslations({ locale, namespace: "Institutional" }),
    getTranslations({ locale, namespace: "InAction" }),
  ])
  const [{ events }, { stories, media, testimonials }, sob] = await Promise.all([getPublishedEvents(), getPublishedStories(), loadSobState()])
  const { upcoming, ongoing } = splitByTiming(events)
  const nextEvents = [...ongoing, ...upcoming].slice(0, 3)
  const views = toPublicMediaViews(media, locale)
  const latestStories = stories.slice(0, 3)
  // Témoignages publiés (vue testimonials_public), dans la langue de la page uniquement.
  const quotes = testimonials.filter((q) => q.locale === locale).slice(0, 2)
  const nf = new Intl.NumberFormat(intlLocale(locale))
  // Sans version State of BIB valide, aucun chiffre n'est affiché.
  const h = isSobAvailable(sob) ? sob.headline : null
  const cities = isSobAvailable(sob) ? localizeSnapshot(sob, locale).topCities.slice(0, 5) : []
  const cityMax = Math.max(1, ...cities.map((c) => c.devs_active_28d))
  const kpis = h
    ? ([
        { v: h.devs_active_28d, k: "devs" },
        { v: h.ecosystems, k: "ecosystems" },
        { v: h.countries, k: "countries" },
        { v: h.cities, k: "cities" },
        { v: h.commits_lifetime, k: "commits" },
      ] as const)
    : []

  const ta = await getTranslations({ locale, namespace: "Site.about" })
  const founders = await Promise.all(
    FOUNDERS.map(async (f) => {
      const ft = await getTranslations({ locale, namespace: f.ns })
      return { ...f, name: ft("name"), role: ft("role") }
    }),
  )
  const eventsVisual = hasVisual("events")
  const newsletterVisual = hasVisual("newsletter")
  const arrow = <span className="ed-arrow" aria-hidden="true">→</span>
  const nav = await getTranslations({ locale, namespace: "Site.nav" })
  const toc = [
    { href: "/#a-propos", label: nav("about") },
    { href: "/#ce-que-nous-faisons", label: ti("about.activitiesTitle") },
    { href: "/#evenements", label: nav("events") },
    { href: "/#en-action", label: nav("inAction") },
    { href: "/#state-of-bib", label: nav("stateOfBib") },
    { href: "/#newsletter", label: tn("title") },
  ]
  const marqueeItems = ["item1", "item2", "item3", "item4"].map((k) => marquee(k))
  const activities = [
    { k: "meet", href: "/evenements" },
    { k: "learn", href: "/resources" },
    { k: "observe", href: "/state_of_bib" },
  ] as const
  const pillars = ["connect", "share", "highlight"] as const

  return (
    <main>
      {/* En-tête : texte à gauche, actions à droite, visuel pleine largeur dessous */}
      <section className="ed-wrap ed-grid-12 ed-hero">
        <div className="ed-col-8 ed-stack" style={{ gap: "1.75rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-display">
            Black <em>in</em> Blockchain
          </h1>
          <p className="ed-lede">{hero("lede")}</p>
        </div>
        <div className="ed-col-4 ed-hero-actions">
          <Link href="/#evenements" className="ed-btn ed-btn-dark">{t("ctaEvents")}</Link>
          <Link href="/state_of_bib" className="ed-btn ed-btn-line">{t("ctaSob")}</Link>
        </div>
      </section>
      {hasVisual("home") && (
        <div className="ed-wrap ed-hero-media">
          <EditorialImage name="home" locale={locale} ratio="21x9" sizes="(max-width: 1264px) 100vw, 1200px" priority />
        </div>
      )}
      <nav className="ed-wrap ed-toc" aria-label={t("onThisPage")}>
        <ol>
          {toc.map((item, i) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span className="ed-num">{String(i + 1).padStart(2, "0")}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* Bandeau défilant : texte décoratif, masqué aux lecteurs d'écran, figé si mouvement réduit */}
      <div className="ed-marquee" aria-hidden="true">
        <div className="ed-marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="ed-marquee-group">
              {marqueeItems.map((m) => (
                <span key={m} className="ed-marquee-item">{m}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* À propos : prémisse et fondateurs */}
      <section id="a-propos" className="ed-section ed-section-white" aria-labelledby="home-about">
        <div className="ed-wrap ed-grid-12" style={{ rowGap: "4rem" }}>
          <p className="ed-eyebrow ed-col-3">{ta("eyebrow")}</p>
          <Reveal className="ed-col-from-4 ed-stack" >
            <h2 id="home-about" className="ed-quote" dangerouslySetInnerHTML={{ __html: manifesto.raw("quote") as string }} />
            <div className="ed-prose" style={{ fontSize: "1.0625rem" }}>
              <p dangerouslySetInnerHTML={{ __html: manifesto.raw("body1") as string }} />
              <p dangerouslySetInnerHTML={{ __html: manifesto.raw("body2") as string }} />
            </div>
            <Link href="/about" className="ed-link" style={{ alignSelf: "flex-start" }}>
              {ta("eyebrow")}&nbsp;{arrow}
            </Link>
          </Reveal>
          <div className="ed-col-3">
            <h3 className="ed-h3">{ta("foundersTitle")}</h3>
          </div>
          <Reveal className="ed-col-from-4 ed-founders">
            {founders.map((f) => (
              <article key={f.slug} className="ed-founder-item">
                <div className="ed-portrait">
                  <Image src={f.image} alt={f.name} fill sizes="(max-width: 768px) 100vw, 440px" style={{ objectFit: "cover", objectPosition: "center 25%" }} />
                </div>
                <h4 className="ed-h3">
                  <Link href={`/fondateurs/${f.slug}`}>{f.name}</Link>
                </h4>
                <span className="text-sm">{f.role}</span>
                <Link href={`/fondateurs/${f.slug}`} className="ed-link" style={{ alignSelf: "flex-start" }}>
                  {ta("readProfile")}&nbsp;{arrow}
                </Link>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Ce que nous développons : les trois activités réelles du collectif */}
      <section id="ce-que-nous-faisons" className="ed-section ed-section-sand" aria-labelledby="home-activities">
        <div className="ed-wrap ed-grid-12" style={{ rowGap: "3.5rem" }}>
          <p className="ed-eyebrow ed-col-3">{ti("about.eyebrow")}</p>
          <div className="ed-col-from-4 ed-stack" style={{ gap: "1.25rem" }}>
            <h2 id="home-activities" className="ed-h2">{ti("about.activitiesTitle")}</h2>
            <p className="ed-lede" style={{ fontSize: "1.0625rem" }}>{ti("about.intro")}</p>
          </div>
          <Reveal className="ed-col-12 ed-pillars">
            {activities.map((a, i) => (
              <article key={a.k} className="ed-pillar">
                <span className="ed-num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="ed-h3">{ti(`about.${a.k}Title`)}</h3>
                <p className="text-sm">{ti(`about.${a.k}Text`)}</p>
                <Link href={a.href} className="ed-link" style={{ alignSelf: "flex-start", marginTop: "auto" }}>
                  {ti(`about.${a.k}Link`)}&nbsp;{arrow}
                </Link>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Notre cap : trois engagements et la méthode éditoriale */}
      <section id="notre-cap" className="ed-section ed-section-white" aria-labelledby="home-mission">
        <div className="ed-wrap ed-grid-12" style={{ rowGap: "3rem" }}>
          <p className="ed-eyebrow ed-col-3">{ti("mission.eyebrow")}</p>
          <div className="ed-col-from-4 ed-stack" style={{ gap: "1.25rem" }}>
            <h2 id="home-mission" className="ed-h2">{ti("mission.pillarsTitle")}</h2>
            <p className="ed-lede" style={{ fontSize: "1.0625rem" }}>{ti("mission.intro")}</p>
          </div>
          <Reveal className="ed-col-from-4">
            <ol className="ed-commitments">
              {pillars.map((p, i) => (
                <li key={p}>
                  <span className="ed-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="ed-h3">{ti(`mission.${p}Title`)}</h3>
                  <p className="text-sm">{ti(`mission.${p}Text`)}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal className="ed-col-from-4 ed-method">
            <h3 className="ed-h3">{ti("mission.methodTitle")}</h3>
            <p>{ti("mission.methodText")}</p>
            <Link href="/mission" className="ed-link" style={{ alignSelf: "flex-start" }}>
              {t("readMission")}&nbsp;{arrow}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Événements à venir */}
      <section id="evenements" className="ed-section" aria-labelledby="home-events">
        <div className="ed-wrap ed-grid-12">
          <div className="ed-col-12 ed-head-row" style={{ marginBottom: "1rem" }}>
            <h2 id="home-events" className="ed-h2">{hb("eventsTitle")}</h2>
            <Link href="/evenements" className="ed-link">
              {t("eventsCalendar")}&nbsp;{arrow}
            </Link>
          </div>
          {eventsVisual && (
            <Reveal className="ed-col-5">
              <EditorialImage name="events" locale={locale} ratio="4x5" sizes="(max-width: 900px) 100vw, 480px" />
            </Reveal>
          )}
          <Reveal className={eventsVisual ? "ed-col-from-7" : "ed-col-12"}>
            {nextEvents.length === 0 ? (
              <p className="ed-note">{t("noEvents")}</p>
            ) : (
              <div className="ed-event-list">
                {nextEvents.map((e) => <EventCard key={e.id} event={e} locale={locale} />)}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* BIB en action : vraies photos uniquement ; message si rien n'est encore publié */}
      <section id="en-action" className="ed-section ed-section-white" aria-labelledby="home-in-action">
        <div className="ed-wrap">
          <div className="ed-head-row">
            <h2 id="home-in-action" className="ed-h2">{hb("inActionTitle")}</h2>
            {latestStories.length > 0 && (
              <Link href="/en-action" className="ed-link">
                {hb("inActionAll")}&nbsp;{arrow}
              </Link>
            )}
          </div>
          {latestStories.length === 0 ? (
            <p className="ed-note">{t("inActionEmpty")}</p>
          ) : (
            <Reveal className="ed-grid">
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
            </Reveal>
          )}
          {quotes.length > 0 && (
            <Reveal className="ed-quotes">
              <h3 className="ed-eyebrow">{tia("testimonials")}</h3>
              {quotes.map((q) => (
                <figure key={q.id} className="ed-testimonial">
                  <blockquote>{q.quote}</blockquote>
                  <figcaption>
                    <strong>{q.author_name}</strong>
                    {q.author_role && <span> · {q.author_role}</span>}
                  </figcaption>
                </figure>
              ))}
            </Reveal>
          )}
        </div>
      </section>

      {/* State of BIB : aperçu sur fond d'encre ; le rapport complet reste sur sa page */}
      <section id="state-of-bib" className="ed-section ed-section-ink" aria-labelledby="home-sob">
        <div className="ed-wrap ed-stack" style={{ gap: "3rem" }}>
          {hasVisual("sob") && (
            <Reveal>
              <EditorialImage name="sob" locale={locale} ratio="3x1" sizes="(max-width: 1264px) 100vw, 1200px" />
            </Reveal>
          )}
          <div className="ed-head-row" style={{ marginBottom: 0 }}>
            <div className="ed-stack" style={{ gap: "1rem" }}>
              <h2 id="home-sob" className="ed-h2">{hb("sobTitle")}</h2>
              <p className="ed-lede" style={{ fontSize: "1.0625rem" }}>{t("sobTeaser")}</p>
            </div>
            <Link href="/state_of_bib" className="ed-btn ed-btn-line-inv">{hb("sobLink")}</Link>
          </div>
          {kpis.length > 0 && (
            <Reveal className="ed-stats">
              {kpis.map((k) => (
                <div key={k.k} className="ed-stat">
                  <strong>{nf.format(k.v)}</strong>
                  <span>{t(`kpi.${k.k}`)}</span>
                </div>
              ))}
            </Reveal>
          )}
          {cities.length > 0 && (
            <Reveal className="ed-cities">
              <h3 className="ed-eyebrow">{t("sobCitiesTitle")}</h3>
              <ol>
                {cities.map((c) => (
                  <li key={c.city} className="ed-city">
                    <span className="ed-num">{String(c.rank).padStart(2, "0")}</span>
                    <span className="ed-city-name">{c.city}<em>{c.country}</em></span>
                    <span className="ed-city-bar" aria-hidden="true">
                      <span style={{ width: `${((c.devs_active_28d / cityMax) * 100).toFixed(1)}%` }} />
                    </span>
                    <span className="ed-city-count">{nf.format(c.devs_active_28d)} {t("sobCitiesUnit")}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}
          {h ? (
            <p className="ed-muted">
              {hb("sobNote", { date: h.snapshot_date })} · {t("sobScope")}
            </p>
          ) : (
            <p className="ed-note" role="status">{hb("sobUnavailable")}</p>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="ed-section" id="newsletter" aria-labelledby="home-newsletter">
        <div className="ed-wrap ed-grid-12" style={{ alignItems: "center" }}>
          {newsletterVisual && (
            <Reveal className="ed-col-5">
              <EditorialImage name="newsletter" locale={locale} ratio="4x5" sizes="(max-width: 900px) 100vw, 480px" />
            </Reveal>
          )}
          <div className={newsletterVisual ? "ed-col-from-7 ed-stack" : "ed-col-12 ed-split"} style={{ gap: "2rem" }}>
            <div className="ed-stack" style={{ gap: "1.25rem" }}>
              <h2 id="home-newsletter" className="ed-h2">{tn("title")}</h2>
              <p className="ed-lede" style={{ fontSize: "1.0625rem" }}>{tn("intro")}</p>
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
        </div>
      </section>

      {/* Clôture : prochaine rencontre */}
      <section className="ed-section ed-section-sand ed-closing" aria-labelledby="home-closing">
        <Reveal className="ed-wrap ed-grid-12">
          <h2 id="home-closing" className="ed-h1 ed-col-8">{ta("ctaTitle")}</h2>
          <div className="ed-col-4 ed-hero-actions">
            <Link href="/evenements" className="ed-btn ed-btn-dark">{ta("ctaEvents")}</Link>
            <Link href="/mission" className="ed-link">{t("readMission")}&nbsp;{arrow}</Link>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
