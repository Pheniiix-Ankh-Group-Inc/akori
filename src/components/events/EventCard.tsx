import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { intlLocale } from "@/lib/content/locales"
import { eventText } from "@/lib/events/text"
import { eventTiming, formatEventDate, formatEventDay } from "@/lib/events/temporal"
import type { EventRecord } from "@/lib/events/types"
import { normalizeLumaUrl } from "@/lib/luma"

/**
 * Carte d'événement (charte éditoriale).
 * - « compact » : ligne date + titre + horaire, format et lieu (accueil) ;
 * - « full » : idem + résumé, fiche et inscription Luma (page Événements).
 */
export async function EventCard({ event, locale, variant = "compact" }: { event: EventRecord; locale: string; variant?: "compact" | "full" }) {
  const t = await getTranslations({ locale, namespace: "Events" })
  const s = await getTranslations({ locale, namespace: "Site.events" })
  const tx = eventText(event, locale)
  const tr = { value: tx }
  const cancelled = event.source_status === "cancelled"
  const timing = eventTiming(event)
  const day = formatEventDay(event.starts_at, event.time_zone, intlLocale(locale))
  const mode = event.mode === "online" ? t("online") : event.mode === "hybrid" ? t("hybrid") : t("inPerson")
  const place = event.mode === "online" ? t("online") : [event.venue_name, event.city].filter(Boolean).join(", ") || event.source_location || ""
  const luma = cancelled ? null : normalizeLumaUrl(event.luma_url)
  const pill = cancelled ? s("cancelled") : timing === "ongoing" ? t("ongoing") : mode
  const href = `/evenements/${event.slug}`

  if (variant === "compact") {
    // Ligne d'événement : la date respire, le titre domine, une seule ligne d'informations.
    const meta = [formatEventDate(event.starts_at, event.time_zone, intlLocale(locale)), event.mode === "online" ? mode : [mode, place].filter(Boolean).join(" · ")]
      .filter(Boolean)
      .join(" · ")
    return (
      <Link href={href} className="ed-event-row">
        <span className="ed-event-row-date" aria-hidden="true">
          <span>{day.month}</span>
          <strong>{day.day}</strong>
        </span>
        <span className="ed-event-row-body">
          {(cancelled || timing === "ongoing") && (
            <span className={cancelled ? "ed-pill ed-pill-danger" : "ed-pill ed-pill-accent"}>{pill}</span>
          )}
          <span className="ed-event-row-title">{tr.value.title}</span>
          <span className="ed-event-row-meta">{meta}</span>
        </span>
        <span className="ed-arrow" aria-hidden="true">→</span>
      </Link>
    )
  }

  return (
    <article className="ed-card">
      <div className="ed-card-body" style={{ gap: "0.7rem" }}>
        <span className={cancelled ? "ed-pill ed-pill-danger" : timing === "ongoing" ? "ed-pill ed-pill-accent" : "ed-pill"}>{pill}</span>
        <h3 className="ed-h3">
          <Link href={href}>{tr.value.title}</Link>
        </h3>
        <p className="ed-muted" style={{ color: "var(--texte-2)" }}>{formatEventDate(event.starts_at, event.time_zone, intlLocale(locale))}</p>
        {place && <p className="ed-muted" style={{ color: "var(--texte-2)" }}>{place}</p>}
        {tr.value.summary && <p className="text-sm">{tr.value.summary}</p>}
        <div className="ed-row" style={{ gap: "0.6rem", marginTop: "auto", paddingTop: "0.5rem" }}>
          <Link href={href} className="ed-btn ed-btn-line">{t("viewDetails")}</Link>
          {luma && (
            <a href={luma} target="_blank" rel="noopener noreferrer" className="ed-btn ed-btn-dark">
              {t("registerLuma")} ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
