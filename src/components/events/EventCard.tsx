import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import { eventTiming, formatEventDate } from "@/lib/events/temporal"
import type { EventRecord } from "@/lib/events/types"

/** Carte d'événement, reprenant les classes existantes (.card). */
export async function EventCard({ event, locale }: { event: EventRecord; locale: string }) {
  const t = await getTranslations({ locale, namespace: "Events" })
  const tr = pickTranslation(event.event_translations, locale)
  if (!tr) return null
  const timing = eventTiming(event)
  const place = event.mode === "online" ? t("online") : [event.venue_name, event.city].filter(Boolean).join(" · ")

  return (
    <article className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "1.5rem" }}>
      {timing === "past" && <span className="tag" style={{ alignSelf: "flex-start" }}>{t("ended")}</span>}
      {timing === "ongoing" && <span className="tag" style={{ alignSelf: "flex-start" }}>{t("ongoing")}</span>}
      <h3 className="heading-xs" style={{ margin: 0 }}>
        <Link href={`/evenements/${event.slug}`}>{tr.value.title}</Link>
      </h3>
      <p className="text-sm" style={{ margin: 0 }}>{formatEventDate(event.starts_at, event.time_zone, intlLocale(locale))}</p>
      {place && <p className="text-sm" style={{ margin: 0 }}>{place}</p>}
      {tr.value.summary && <p className="text-sm" style={{ margin: 0 }}>{tr.value.summary}</p>}
      <Link href={`/evenements/${event.slug}`} className="label" style={{ marginTop: "auto" }}>
        {t("viewDetails")} →
      </Link>
    </article>
  )
}
