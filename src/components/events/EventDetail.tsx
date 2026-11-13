import { getTranslations } from "next-intl/server"
import { intlLocale, pickLocalized, pickTranslation } from "@/lib/content/locales"
import { eventTiming, formatEventDate } from "@/lib/events/temporal"
import type { EventRecord, PublicMedia } from "@/lib/events/types"
import { normalizeLumaUrl } from "@/lib/luma"

const LANG_NAMES: Record<string, string> = { fr: "français", en: "English", es: "español" }

/**
 * Fiche détaillée d'un événement. Utilisée par la page publique et par
 * l'aperçu privé de l'administration (avec l'URL d'image fournie).
 */
export async function EventDetail({
  event,
  locale,
  coverUrl,
  cover,
  backLink,
}: {
  event: EventRecord
  locale: string
  coverUrl: string | null
  cover: PublicMedia | null
  backLink?: React.ReactNode
}) {
  const t = await getTranslations({ locale, namespace: "Events" })
  const tr = pickTranslation(event.event_translations, locale)
  const timing = eventTiming(event)
  const luma = normalizeLumaUrl(event.luma_url)
  const modeLabel = event.mode === "online" ? t("online") : event.mode === "hybrid" ? t("hybrid") : t("inPerson")
  const place = [event.venue_name, event.address, event.city, event.country_code].filter(Boolean).join(", ")

  return (
    <main>
      <section className="section">
        <div className="wrap-sm">
          <div style={{ marginBottom: "3rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            {backLink}
            {timing === "past" && <span className="tag" style={{ display: "inline-block", marginTop: "1rem" }}>{t("ended")}</span>}
            {timing === "ongoing" && <span className="tag" style={{ display: "inline-block", marginTop: "1rem" }}>{t("ongoing")}</span>}
            <h1 className="heading-md">{tr?.value.title ?? event.slug}</h1>
            {tr?.isFallback && (
              <p className="text-xs" style={{ marginTop: "0.5rem" }}>
                {t("translationFallback", { language: LANG_NAMES[tr.shownLocale] ?? tr.shownLocale })}
              </p>
            )}
          </div>

          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- fichier Supabase Storage, dimensions variables
            <img
              src={coverUrl}
              alt={pickLocalized(cover?.alt_text, locale)}
              loading="lazy"
              style={{ width: "100%", height: "auto", borderRadius: "var(--r)", marginBottom: "2rem" }}
            />
          )}

          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.75rem 1.5rem", marginBottom: "2rem" }}>
            <dt className="label">{t("when")}</dt>
            <dd style={{ margin: 0 }}>
              {formatEventDate(event.starts_at, event.time_zone, intlLocale(locale))}
              {event.ends_at && <> — {formatEventDate(event.ends_at, event.time_zone, intlLocale(locale))}</>}
            </dd>
            <dt className="label">{t("format")}</dt>
            <dd style={{ margin: 0 }}>{modeLabel}</dd>
            {place && (
              <>
                <dt className="label">{t("where")}</dt>
                <dd style={{ margin: 0 }}>{place}</dd>
              </>
            )}
            {event.online_url && timing !== "past" && (
              <>
                <dt className="label">{t("joinOnline")}</dt>
                <dd style={{ margin: 0 }}>
                  <a href={event.online_url} rel="noopener noreferrer" target="_blank">{event.online_url}</a>
                </dd>
              </>
            )}
          </dl>

          {tr?.value.summary && <p className="section-intro" style={{ marginBottom: "1.5rem" }}>{tr.value.summary}</p>}
          {tr?.value.description && (
            <div className="legal-content" style={{ whiteSpace: "pre-line", marginBottom: "2rem" }}>{tr.value.description}</div>
          )}

          {luma && timing !== "past" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
              <a href={luma} target="_blank" rel="noopener noreferrer" className="badge" style={{ textDecoration: "none" }}>
                {t("registerLuma")} ↗
              </a>
              <span className="text-xs">{t("registerNote")}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
