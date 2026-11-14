import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedEventBySlug } from "@/lib/events/queries"
import { pickTranslation } from "@/lib/content/locales"
import { publicMediaUrl } from "@/lib/supabase/public"
import { EventDetail } from "@/components/events/EventDetail"

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const { event } = await getPublishedEventBySlug(slug)
  if (!event) return {}
  const tr = pickTranslation(event.event_translations, locale)
  return { title: tr?.value.title, description: tr?.value.summary ?? undefined }
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const { event, cover } = await getPublishedEventBySlug(slug)
  if (!event) notFound()
  const t = await getTranslations({ locale, namespace: "Events" })

  return (
    <EventDetail
      event={event}
      locale={locale}
      cover={cover}
      coverUrl={publicMediaUrl(cover?.public_path)}
      backLink={<Link href="/evenements" className="ed-link">← {t("back")}</Link>}
    />
  )
}
