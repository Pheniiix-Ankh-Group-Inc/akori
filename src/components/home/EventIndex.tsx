import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { intlLocale } from "@/lib/content/locales"
import { eventText } from "@/lib/events/text"
import { formatEventDate } from "@/lib/events/temporal"
import type { EventRecord } from "@/lib/events/types"
import { normalizeLumaUrl } from "@/lib/luma"

/**
 * Index éditorial des événements (accueil). Chaque ligne est un <details> :
 * ouverture au clic, au clavier (Entrée, Espace) et sans JavaScript. Date,
 * titre, lieu et format restent lisibles ligne fermée ; la ligne ouverte
 * ajoute le résumé, la fiche et l'inscription Luma quand elle existe.
 * Aucun événement n'est inventé : la liste vient de Supabase.
 */
export async function EventIndex({ events, locale }: { events: EventRecord[]; locale: string }) {
  const t = await getTranslations({ locale, namespace: "Events" })
  const im = await getTranslations({ locale, namespace: "Immersive.events" })
  return (
    <ul className="im-index">
      {events.map((event, i) => {
        const tx = eventText(event, locale)
        const cancelled = event.source_status === "cancelled"
        const mode = event.mode === "online" ? t("online") : event.mode === "hybrid" ? t("hybrid") : t("inPerson")
        const place = event.mode === "online" ? t("online") : [event.venue_name, event.city].filter(Boolean).join(", ") || event.source_location || ""
        const luma = cancelled ? null : normalizeLumaUrl(event.luma_url)
        const href = `/evenements/${event.slug}`
        return (
          <li key={event.id} className="im-rv">
            <details open={i === 0}>
              <summary className="im-row">
                <span className="im-t" style={{ fontSize: "clamp(1.25rem, 1.6vw, 1.75rem)" }}>
                  {formatEventDate(event.starts_at, event.time_zone, intlLocale(locale))}
                </span>
                <span className="im-t" style={{ fontSize: "clamp(1.5rem, 2vw, 2.125rem)", lineHeight: 1.15 }}>
                  {tx.title}
                  {cancelled && <span className="ed-pill ed-pill-danger" style={{ marginLeft: "0.75rem", verticalAlign: "middle" }}>{im("cancelled")}</span>}
                </span>
                <span className="im-hx" style={{ fontSize: "0.9375rem", color: "var(--texte-2)" }}>{place}</span>
                <span className="im-hx" style={{ fontSize: "0.9375rem", color: "var(--texte-2)" }}>{mode}</span>
                <span className="im-row-btn">{im("details")}</span>
              </summary>
              <div className="im-row-more">
                <div style={{ gridColumn: "1 / span 7", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <p className="im-p" style={{ fontSize: "0.9375rem" }}>{[place, mode].filter(Boolean).join(" · ")}</p>
                  {tx.summary && <p className="im-p">{tx.summary}</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center" }}>
                    {luma && (
                      <a href={luma} target="_blank" rel="noopener noreferrer" className="ed-btn ed-btn-dark">
                        {t("registerLuma")} ↗
                      </a>
                    )}
                    <Link href={href} className="im-link">
                      {t("viewDetails")}
                    </Link>
                  </div>
                </div>
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}
