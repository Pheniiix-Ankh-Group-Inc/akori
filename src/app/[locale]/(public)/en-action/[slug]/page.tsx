import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedStoryBySlug } from "@/lib/stories/queries"
import { getPublishedEvents } from "@/lib/events/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { pickTranslation } from "@/lib/content/locales"
import { StoryDetail } from "@/components/en-action/StoryDetail"

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const { story } = await getPublishedStoryBySlug(slug)
  if (!story) return {}
  const tr = pickTranslation(story.story_translations, locale)
  return { title: tr?.value.title, description: tr?.value.seo_description ?? tr?.value.summary ?? undefined }
}

export default async function StoryPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const { story, media, testimonials } = await getPublishedStoryBySlug(slug)
  if (!story) notFound()
  const t = await getTranslations({ locale, namespace: "InAction" })

  let eventLink: React.ReactNode = null
  if (story.event_id) {
    const { events } = await getPublishedEvents()
    const ev = events.find((e) => e.id === story.event_id)
    const evTr = ev ? pickTranslation(ev.event_translations, locale) : null
    if (ev && evTr) {
      eventLink = (
        <p className="text-sm">
          {t("relatedEvent")} : <Link href={`/evenements/${ev.slug}`}>{evTr.value.title}</Link>
        </p>
      )
    }
  }

  return (
    <StoryDetail
      story={story}
      locale={locale}
      media={toPublicMediaViews(media, locale)}
      testimonials={testimonials}
      eventLink={eventLink}
      backLink={<Link href="/en-action" className="label">← {t("back")}</Link>}
    />
  )
}
