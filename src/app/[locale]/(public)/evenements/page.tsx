import { Link } from "@/i18n/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getPublishedEvents } from "@/lib/events/queries"
import { getPublishedStories } from "@/lib/stories/queries"
import { splitByTiming, eventTiming } from "@/lib/events/temporal"
import { intlLocale } from "@/lib/content/locales"
import { eventText } from "@/lib/events/text"
import { EVENT_STATUSES, filterByStatus, localDay, monthGrid, paginate, parseEventFilters, shiftMonth, yearsOf, type EventFilters } from "@/lib/events/calendar"
import { EventCard } from "@/components/events/EventCard"
import { getLumaEmbedUrl } from "@/lib/luma"
import { env } from "@/lib/env"
import type { EventRecord } from "@/lib/events/types"

export const revalidate = 300

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Events" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

function query(f: EventFilters, patch: Partial<EventFilters>): Record<string, string> {
  const n = { ...f, ...patch }
  const q: Record<string, string> = {}
  if (n.view !== "liste") q.vue = n.view
  if (n.status !== "tous") q.statut = n.status
  if (n.view === "mois") q.mois = n.month
  if (n.view === "liste" && n.year) q.annee = String(n.year)
  if (n.view === "liste" && n.page > 1) q.page = String(n.page)
  return q
}

/**
 * Événements : calendrier BIB alimenté par Supabase (synchronisé depuis Luma).
 * Vue liste (En cours / À venir / Passés, historique paginé sans limite) ou
 * vue mensuelle ; filtres par statut et par date (année ou mois) dans l'URL.
 */
export default async function EvenementsPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const f = parseEventFilters(sp)
  const t = await getTranslations({ locale, namespace: "Events" })
  const s = await getTranslations({ locale, namespace: "Site.events" })
  const about = await getTranslations({ locale, namespace: "Site.about" })
  const [{ configured, events }, { stories }] = await Promise.all([getPublishedEvents(), getPublishedStories()])
  const storyByEvent = new Map(stories.filter((st) => st.event_id).map((st) => [st.event_id as string, st.slug]))
  const loc = intlLocale(locale)
  const dateFmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" })

  const filtered = filterByStatus(f.year ? events.filter((e) => localDay(e.starts_at, e.time_zone).startsWith(String(f.year))) : events, f.status)
  const { upcoming, ongoing, past } = splitByTiming(filtered)
  const pastPage = paginate(past, f.page)
  const years = yearsOf(events)

  const viewTabs = (
    <nav className="ev-tabs" aria-label={s("views")}>
      <Link href={{ pathname: "/evenements", query: query(f, { view: "liste", page: 1 }) }} aria-current={f.view === "liste" ? "page" : undefined}>{s("viewList")}</Link>
      <Link href={{ pathname: "/evenements", query: query(f, { view: "mois" }) }} aria-current={f.view === "mois" ? "page" : undefined}>{s("viewMonth")}</Link>
    </nav>
  )

  const filters = (
    <form className="ev-filters" action="" method="get">
      {f.view === "mois" && <input type="hidden" name="vue" value="mois" />}
      {f.view === "mois" && <input type="hidden" name="mois" value={f.month} />}
      <label className="sob-control">
        <span>{s("status")}</span>
        <select className="ed-input" name="statut" defaultValue={f.status}>
          {EVENT_STATUSES.map((st) => <option key={st} value={st}>{s(`statuses.${st}`)}</option>)}
        </select>
      </label>
      {f.view === "liste" && (
        <label className="sob-control">
          <span>{s("year")}</span>
          <select className="ed-input" name="annee" defaultValue={f.year ? String(f.year) : ""}>
            <option value="">{s("allYears")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      )}
      <button type="submit" className="ed-btn ed-btn-line">{s("apply")}</button>
    </form>
  )

  const pastRow = (e: EventRecord) => {
    const tx = eventText(e, locale)
    const story = storyByEvent.get(e.id)
    return (
      <li key={e.id}>
        <span className="ed-muted" style={{ flex: "0 0 11rem" }}>{dateFmt.format(new Date(e.starts_at))}</span>
        <Link href={`/evenements/${e.slug}`} className="ed-h3" style={{ flex: "1 1 20rem", fontSize: "1.35rem" }}>{tx.title}</Link>
        <span className="text-sm">{e.source_status === "cancelled" ? s("cancelled") : e.mode === "online" ? t("online") : e.city ?? e.source_location ?? ""}</span>
        {story ? <Link href={`/en-action/${story}`} className="ed-link">{t("viewRetrospective")} →</Link> : <span className="ed-muted">{s("noRetrospective")}</span>}
      </li>
    )
  }

  // Vue mensuelle
  const weekdays = s("weekdays").split(",")
  const grid = monthGrid(f.month, filtered)
  const monthTitle = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${f.month}-01T00:00:00Z`))
  const monthHasEvents = grid.flat().some((d) => d.inMonth && d.events.length)
  // Calendrier Luma embarqué (intégration conservée depuis main).
  const embedUrl = getLumaEmbedUrl(env.luma.calendarId)

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "7rem", paddingBottom: "3rem" }}>
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
          <section className="ed-wrap ev-toolbar" aria-label={s("calendar")}>
            {viewTabs}
            {filters}
          </section>

          {f.view === "mois" ? (
            <section className="ed-wrap" style={{ paddingBottom: "5rem" }} aria-labelledby="h-month">
              <div className="ev-month-head">
                <Link href={{ pathname: "/evenements", query: query(f, { month: shiftMonth(f.month, -1) }) }} className="sob-icon-btn" aria-label={s("prevMonth")}>←</Link>
                <h2 id="h-month" className="ed-h2" style={{ textTransform: "capitalize" }}>{monthTitle}</h2>
                <Link href={{ pathname: "/evenements", query: query(f, { month: shiftMonth(f.month, 1) }) }} className="sob-icon-btn" aria-label={s("nextMonth")}>→</Link>
              </div>
              <table className="ev-cal">
                <caption className="sr-only">{s("calendar")} — {monthTitle}</caption>
                <thead>
                  <tr>{weekdays.map((d) => <th key={d} scope="col">{d}</th>)}</tr>
                </thead>
                <tbody>
                  {grid.map((week, i) => (
                    <tr key={i}>
                      {week.map((day) => (
                        <td key={day.date} className={`${day.inMonth ? "" : "is-out"}${day.events.length ? " has-events" : ""}`}>
                          <span className="ev-cal-day">{Number(day.date.slice(8))}</span>
                          <ul>
                            {day.events.map((e) => {
                              const tx = eventText(e, locale)
                              const timing = eventTiming(e)
                              return (
                                <li key={e.id} className={`ev-cal-item is-${timing}${e.source_status === "cancelled" ? " is-cancelled" : ""}`}>
                                  <Link href={`/evenements/${e.slug}`}>
                                    <time dateTime={e.starts_at}>{new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", timeZone: e.time_zone }).format(new Date(e.starts_at))}</time> {tx.title}
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!monthHasEvents && <p className="ed-note" style={{ marginTop: "1.5rem" }}>{s("noneMonth")}</p>}
            </section>
          ) : (
            <>
              {filtered.length === 0 && (
                <section className="ed-wrap" style={{ paddingBottom: "3rem" }}><p className="ed-note">{s("noneFilter")}</p></section>
              )}
              {ongoing.length > 0 && (
                <section aria-labelledby="h-ongoing" className="ed-wrap" style={{ paddingBottom: "3.5rem" }}>
                  <h2 id="h-ongoing" className="ed-row" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--blanc)", marginBottom: "1.25rem", gap: "0.6rem" }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                    {t("ongoing")}
                  </h2>
                  <div className="ed-grid">{ongoing.map((e) => <EventCard key={e.id} event={e} locale={locale} variant="full" />)}</div>
                </section>
              )}
              {(f.status === "tous" || f.status === "a-venir") && (
                <section aria-labelledby="h-upcoming" className="ed-wrap" style={{ paddingBottom: "5rem" }}>
                  <h2 id="h-upcoming" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("upcoming")}</h2>
                  {upcoming.length === 0 ? <p className="ed-note">{t("noUpcoming")}</p> : <div className="ed-grid">{upcoming.map((e) => <EventCard key={e.id} event={e} locale={locale} variant="full" />)}</div>}
                </section>
              )}
              {(f.status === "tous" || f.status === "passes") && (
                <section aria-labelledby="h-past" className="ed-section">
                  <div className="ed-wrap">
                    <h2 id="h-past" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("past")}</h2>
                    {past.length === 0 ? (
                      <p className="ed-note">{t("noPast")}</p>
                    ) : (
                      <>
                        <ul className="ed-list-rows">{pastPage.items.map(pastRow)}</ul>
                        {pastPage.pages > 1 && (
                          <nav className="ev-pager" aria-label={s("pageOf", { page: pastPage.page, pages: pastPage.pages })}>
                            {pastPage.page > 1 ? <Link href={{ pathname: "/evenements", query: query(f, { page: pastPage.page - 1 }) }} className="ed-btn ed-btn-line" rel="prev">← {s("pagePrev")}</Link> : <span />}
                            <span className="ed-muted">{s("pageOf", { page: pastPage.page, pages: pastPage.pages })}</span>
                            {pastPage.page < pastPage.pages ? <Link href={{ pathname: "/evenements", query: query(f, { page: pastPage.page + 1 }) }} className="ed-btn ed-btn-line" rel="next">{s("pageNext")} →</Link> : <span />}
                          </nav>
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {embedUrl && (
        <section className="ed-section ed-section-white" aria-labelledby="h-luma">
          <div className="ed-wrap ed-stack" style={{ gap: "1.25rem" }}>
            <h2 id="h-luma" className="ed-h2">{s("embedTitle")}</h2>
            <p className="text-sm">{s("embedNote")}</p>
            <iframe
              src={embedUrl}
              title={s("embedTitle")}
              className="ev-embed"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="fullscreen; payment"
            />
          </div>
        </section>
      )}

      <section className="ed-section">
        <div className="ed-wrap ed-row" style={{ justifyContent: "space-between", paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div className="ed-stack" style={{ gap: "0.4rem" }}>
            <p className="ed-h3" style={{ fontSize: "1.75rem" }}>{s("ctaTitle")}</p>
            <p className="text-sm">{s("ctaText")}</p>
          </div>
          <Link href="/#newsletter" className="ed-btn ed-btn-line">{about("ctaNewsletter")}</Link>
        </div>
      </section>
    </main>
  )
}
