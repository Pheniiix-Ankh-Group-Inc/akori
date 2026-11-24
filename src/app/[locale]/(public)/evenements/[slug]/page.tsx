import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedEventBySlug } from "@/lib/events/queries"
import { eventText } from "@/lib/events/text"
import { publicMediaUrl } from "@/lib/supabase/public"
import { EventDetail } from "@/components/events/EventDetail"
import { getPublishedStories } from "@/lib/stories/queries"
import { pickTranslation } from "@/lib/content/locales"

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const { event } = await getPublishedEventBySlug(slug)
  if (!event) return {}
  const tx = eventText(event, locale)
  const t = await getTranslations({ locale, namespace: "Events" })
  return { title: tx.title, description: tx.summary ?? t("metaDescription") }
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const { event, cover } = await getPublishedEventBySlug(slug)
  if (!event) notFound()
  const t = await getTranslations({ locale, namespace: "Events" })
  const s = await getTranslations({ locale, namespace: "Site.events" })
  // Rétrospectives « BIB en action » associées à cet événement.
  const { stories } = await getPublishedStories()
  const retros = stories.filter((st) => st.event_id === event.id)

  return (
    <EventDetail
      event={event}
      locale={locale}
      cover={cover}
      coverUrl={publicMediaUrl(cover?.public_path)}
      backLink={<Link href="/evenements" className="ed-link">← {t("back")}</Link>}
      related={
        retros.length > 0 ? (
          <section className="ed-section ed-section-white" aria-labelledby="ev-retros">
            <div className="ed-wrap ed-stack" style={{ gap: "1rem" }}>
              <h2 id="ev-retros" className="ed-h2">{s("retrospective")}</h2>
              <ul className="ed-list-rows">
                {retros.map((st) => (
                  <li key={st.id}>
                    <Link href={`/en-action/${st.slug}`} className="ed-link">{pickTranslation(st.story_translations, locale)?.value.title ?? st.slug} →</Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null
      }
    />
  )
}
