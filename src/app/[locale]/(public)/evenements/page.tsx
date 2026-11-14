import { Link } from "@/i18n/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getPublishedEvents } from "@/lib/events/queries"
import { getPublishedStories } from "@/lib/stories/queries"
import { splitByTiming } from "@/lib/events/temporal"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import { EventCard } from "@/components/events/EventCard"

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Events" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

export default async function EvenementsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Events" })
  const s = await getTranslations({ locale, namespace: "Site.events" })
  const [{ configured, events }, { stories }] = await Promise.all([getPublishedEvents(), getPublishedStories()])
  const { upcoming, ongoing, past } = splitByTiming(events)
  // Rétrospective publiée liée à un événement passé, s'il y en a une.
  const storyByEvent = new Map(stories.filter((st) => st.event_id).map((st) => [st.event_id as string, st.slug]))
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" })

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "7rem", paddingBottom: "4rem" }}>
        <div className="ed-stack">
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{s("title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>

      {!configured && (
        <section className="ed-wrap" style={{ paddingBottom: "5rem" }}>
          <p className="ed-note">{t("notConfigured")}</p>
        </section>
      )}

      {configured && (
        <>
          {ongoing.length > 0 && (
            <section aria-labelledby="h-ongoing" className="ed-wrap" style={{ paddingBottom: "3.5rem" }}>
              <h2 id="h-ongoing" className="ed-row" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--blanc)", marginBottom: "1.25rem", gap: "0.6rem" }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                {t("ongoing")}
              </h2>
              <div className="ed-grid">
                {ongoing.map((e) => <EventCard key={e.id} event={e} locale={locale} variant="full" />)}
              </div>
            </section>
          )}

          <section aria-labelledby="h-upcoming" className="ed-wrap" style={{ paddingBottom: "5rem" }}>
            <h2 id="h-upcoming" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("upcoming")}</h2>
            {upcoming.length === 0 ? (
              <p className="ed-note">{t("noUpcoming")}</p>
            ) : (
              <div className="ed-grid">
                {upcoming.map((e) => <EventCard key={e.id} event={e} locale={locale} variant="full" />)}
              </div>
            )}
          </section>

          <section aria-labelledby="h-past" className="ed-section">
            <div className="ed-wrap">
              <h2 id="h-past" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("past")}</h2>
              {past.length === 0 ? (
                <p className="ed-note">{t("noPast")}</p>
              ) : (
                <ul className="ed-list-rows">
                  {past.map((e) => {
                    const tr = pickTranslation(e.event_translations, locale)
                    const story = storyByEvent.get(e.id)
                    return (
                      <li key={e.id}>
                        <span className="ed-muted" style={{ flex: "0 0 11rem" }}>{dateFmt.format(new Date(e.starts_at))}</span>
                        <Link href={`/evenements/${e.slug}`} className="ed-h3" style={{ flex: "1 1 20rem", fontSize: "1.35rem" }}>
                          {tr?.value.title ?? e.slug}
                        </Link>
                        <span className="text-sm">{e.mode === "online" ? t("online") : e.city ?? ""}</span>
                        {story ? (
                          <Link href={`/en-action/${story}`} className="ed-link">{t("viewRetrospective")} →</Link>
                        ) : (
                          <span className="ed-muted">{s("noRetrospective")}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      <section className="ed-section">
        <div className="ed-wrap ed-row" style={{ justifyContent: "space-between", paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div className="ed-stack" style={{ gap: "0.4rem" }}>
            <p className="ed-h3" style={{ fontSize: "1.75rem" }}>{s("ctaTitle")}</p>
            <p className="text-sm">{s("ctaText")}</p>
          </div>
          <Link href="/#newsletter" className="ed-btn ed-btn-line">{(await getTranslations({ locale, namespace: "Site.about" }))("ctaNewsletter")}</Link>
        </div>
      </section>
    </main>
  )
}
