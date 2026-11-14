import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import { eventTiming, formatEventDate, formatEventDay } from "@/lib/events/temporal"
import type { EventRecord } from "@/lib/events/types"
import { normalizeLumaUrl } from "@/lib/luma"

/**
 * Carte d'événement (charte éditoriale).
 * - « compact » : bloc date + titre + horaire (accueil) ;
 * - « full » : idem + résumé, fiche et inscription Luma (page Événements).
 */
export async function EventCard({ event, locale, variant = "compact" }: { event: EventRecord; locale: string; variant?: "compact" | "full" }) {
  const t = await getTranslations({ locale, namespace: "Events" })
  const tr = pickTranslation(event.event_translations, locale)
  if (!tr) return null
  const timing = eventTiming(event)
  const day = formatEventDay(event.starts_at, event.time_zone, intlLocale(locale))
  const mode = event.mode === "online" ? t("online") : event.mode === "hybrid" ? t("hybrid") : t("inPerson")
  const place = event.mode === "online" ? t("online") : [event.venue_name, event.city].filter(Boolean).join(", ")
  const luma = normalizeLumaUrl(event.luma_url)
  const href = `/evenements/${event.slug}`

  if (variant === "compact") {
    return (
      <Link href={href} className="ed-card" style={{ flexDirection: "row", gap: "1.25rem", padding: "1.6rem" }}>
        <div className="ed-date" aria-hidden="true">
          <span>{day.month}</span>
          <strong>{day.day}</strong>
        </div>
        <div className="ed-stack" style={{ gap: "0.45rem" }}>
          <span className={timing === "ongoing" ? "ed-pill ed-pill-accent" : "ed-pill"}>{timing === "ongoing" ? t("ongoing") : mode}</span>
          <span className="ed-h3" style={{ fontSize: "1.35rem" }}>{tr.value.title}</span>
          <span className="ed-muted" style={{ color: "var(--texte-2)" }}>{formatEventDate(event.starts_at, event.time_zone, intlLocale(locale))}</span>
          {place && <span className="ed-muted" style={{ color: "var(--texte-2)" }}>{place}</span>}
        </div>
      </Link>
    )
  }

  return (
    <article className="ed-card">
      <div className="ed-card-body" style={{ gap: "0.7rem" }}>
        <span className={timing === "ongoing" ? "ed-pill ed-pill-accent" : "ed-pill"}>{timing === "ongoing" ? t("ongoing") : mode}</span>
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
