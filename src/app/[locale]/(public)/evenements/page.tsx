import { Link } from "@/i18n/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getPublishedEvents } from "@/lib/events/queries"
import { splitByTiming } from "@/lib/events/temporal"
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
  const { configured, events } = await getPublishedEvents()
  const { upcoming, ongoing, past } = splitByTiming(events)
  const current = [...ongoing, ...upcoming]

  return (
    <main>
      <section className="section">
        <div className="wrap-sm">
          <div style={{ marginBottom: "4rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label">← Black in Blockchain</Link>
            <h1 className="heading-md">{t("title")}</h1>
            <p className="section-intro" style={{ marginTop: "1rem" }}>{t("intro")}</p>
          </div>

          {!configured && <p className="text-sm">{t("notConfigured")}</p>}

          {configured && (
            <>
              <h2 className="heading-sm" style={{ marginBottom: "1.5rem" }}>{t("upcoming")}</h2>
              {current.length === 0 ? (
                <p className="text-sm" style={{ marginBottom: "3rem" }}>{t("noUpcoming")}</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "4rem" }}>
                  {current.map((e) => <EventCard key={e.id} event={e} locale={locale} />)}
                </div>
              )}

              <h2 className="heading-sm" style={{ marginBottom: "1.5rem" }}>{t("past")}</h2>
              {past.length === 0 ? (
                <p className="text-sm">{t("noPast")}</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
                  {past.map((e) => <EventCard key={e.id} event={e} locale={locale} />)}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
