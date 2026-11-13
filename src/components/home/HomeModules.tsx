import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedEvents } from "@/lib/events/queries"
import { splitByTiming } from "@/lib/events/temporal"
import { getPublishedStories } from "@/lib/stories/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { pickTranslation } from "@/lib/content/locales"
import { loadSobSnapshot } from "@/lib/sob/load"
import { EventCard } from "@/components/events/EventCard"
import { NewsletterForm } from "@/components/newsletter/NewsletterForm"

const RUBRICS = ["blockchain_insights", "blockchain_news", "bib_events", "bib_highlights"] as const

/**
 * Blocs simples ajoutés à l'accueil existant, avec les classes déjà
 * présentes (section, wrap, card…) : aperçu des événements publiés, de
 * BIB en action, accès à State of BIB et abonnement newsletter.
 * Un bloc sans contenu publié n'est pas affiché (aucun contenu factice).
 */
export async function HomeModules({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "HomeBlocks" })
  const tn = await getTranslations({ locale, namespace: "Newsletter" })
  const [{ events }, { stories, media }, sob] = await Promise.all([getPublishedEvents(), getPublishedStories(), loadSobSnapshot()])
  const { upcoming, ongoing } = splitByTiming(events)
  const nextEvents = [...ongoing, ...upcoming].slice(0, 3)
  const views = toPublicMediaViews(media, locale)
  const latestStories = stories.slice(0, 3)

  return (
    <>
      {nextEvents.length > 0 && (
        <section className="section" aria-labelledby="home-events">
          <div className="wrap">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", marginBottom: "2rem" }}>
              <h2 id="home-events" className="heading-md" style={{ margin: 0 }}>{t("eventsTitle")}</h2>
              <Link href="/evenements" className="label">{t("eventsAll")} →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
              {nextEvents.map((e) => <EventCard key={e.id} event={e} locale={locale} />)}
            </div>
          </div>
        </section>
      )}

      {latestStories.length > 0 && (
        <section className="section" aria-labelledby="home-in-action">
          <div className="wrap">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", marginBottom: "2rem" }}>
              <h2 id="home-in-action" className="heading-md" style={{ margin: 0 }}>{t("inActionTitle")}</h2>
              <Link href="/en-action" className="label">{t("inActionAll")} →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
              {latestStories.map((s) => {
                const tr = pickTranslation(s.story_translations, locale)
                const cover = s.cover_media_id ? views[s.cover_media_id] : undefined
                return (
                  <article key={s.id} className="card" style={{ overflow: "hidden" }}>
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
                      <img src={cover.url} alt={cover.alt} loading="lazy" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }} />
                    )}
                    <div style={{ padding: "1.25rem" }}>
                      <h3 className="heading-xs" style={{ margin: 0 }}>
                        <Link href={`/en-action/${s.slug}`}>{tr?.value.title ?? s.slug}</Link>
                      </h3>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="home-sob">
        <div className="wrap" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem" }}>
          <div>
            <h2 id="home-sob" className="heading-md" style={{ margin: 0 }}>{t("sobTitle")}</h2>
            <p className="text-sm" style={{ marginTop: "0.75rem" }}>
              {t("sobNote", { date: sob.headline.snapshot_date, source: sob.meta.source.name, license: sob.meta.source.license })}
            </p>
          </div>
          <Link href="/state_of_bib" className="badge" style={{ textDecoration: "none" }}>{t("sobLink")} →</Link>
        </div>
      </section>

      <section className="section" id="newsletter" aria-labelledby="home-newsletter">
        <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: "3rem" }}>
          <div style={{ flex: "1 1 360px" }}>
            <h2 id="home-newsletter" className="heading-md" style={{ marginTop: 0 }}>{tn("title")}</h2>
            <p className="section-intro">{tn("intro")}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0", display: "grid", gap: "0.85rem" }}>
              {RUBRICS.map((r) => (
                <li key={r} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <strong>{tn(`rubrics.${r}.title`)}</strong>
                  <span className="text-sm" style={{ display: "block" }}>{tn(`rubrics.${r}.desc`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: "1 1 360px" }}>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  )
}
