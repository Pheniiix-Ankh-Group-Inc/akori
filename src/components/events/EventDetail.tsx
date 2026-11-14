import { getTranslations } from "next-intl/server"
import { intlLocale, pickLocalized, pickTranslation } from "@/lib/content/locales"
import { eventTiming, formatEventDate } from "@/lib/events/temporal"
import type { EventRecord, PublicMedia } from "@/lib/events/types"
import { normalizeLumaUrl } from "@/lib/luma"

const LANG_NAMES: Record<string, string> = { fr: "français", en: "English", es: "español" }

/**
 * Fiche détaillée d'un événement (deux colonnes : récit + encadré pratique).
 * Utilisée par la page publique et par l'aperçu privé de l'administration.
 * Une seule pastille d'état est affichée (terminé, en cours ou format).
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
  const s = await getTranslations({ locale, namespace: "Site.events" })
  const tr = pickTranslation(event.event_translations, locale)
  const timing = eventTiming(event)
  const luma = normalizeLumaUrl(event.luma_url)
  const modeLabel = event.mode === "online" ? t("online") : event.mode === "hybrid" ? t("hybrid") : t("inPerson")
  const place = [event.venue_name, event.address, event.city, event.country_code].filter(Boolean).join(", ")
  const loc = intlLocale(locale)
  const status = timing === "past" ? t("ended") : timing === "ongoing" ? t("ongoing") : modeLabel

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "4rem", paddingBottom: "6rem" }}>
        {backLink && <div style={{ marginBottom: "2rem" }}>{backLink}</div>}
        <div className="ed-stack" style={{ maxWidth: "52rem", marginBottom: "3rem" }}>
          <span className={timing === "ongoing" ? "ed-pill ed-pill-accent" : "ed-pill"} style={{ alignSelf: "flex-start" }}>{status}</span>
          <h1 className="ed-h1">{tr?.value.title ?? event.slug}</h1>
          {tr?.isFallback && (
            <p className="ed-muted">{t("translationFallback", { language: LANG_NAMES[tr.shownLocale] ?? tr.shownLocale })}</p>
          )}
          {tr?.value.summary && <p className="ed-lede">{tr.value.summary}</p>}
        </div>

        <div className="ed-detail">
          <div className="ed-stack" style={{ gap: "2rem" }}>
            {coverUrl && (
              <figure className="ed-figure">
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier Supabase Storage, dimensions variables */}
                <img src={coverUrl} alt={pickLocalized(cover?.alt_text, locale)} loading="lazy" />
              </figure>
            )}
            {tr?.value.description && <div className="ed-prose" style={{ whiteSpace: "pre-line" }}>{tr.value.description}</div>}
          </div>

          <aside className="ed-card" aria-labelledby="h-practical" style={{ alignSelf: "start" }}>
            <div className="ed-card-body" style={{ gap: "1.25rem" }}>
              <h2 id="h-practical" className="ed-eyebrow" style={{ margin: 0 }}>{s("practical")}</h2>
              <dl className="ed-dl">
                <dt>{t("when")}</dt>
                <dd>
                  {formatEventDate(event.starts_at, event.time_zone, loc)}
                  {event.ends_at && <><br />{s("until", { time: formatEventDate(event.ends_at, event.time_zone, loc) })}</>}
                </dd>
                <dt>{t("format")}</dt>
                <dd>{modeLabel}</dd>
                {place && (
                  <>
                    <dt>{t("where")}</dt>
                    <dd>{place}</dd>
                  </>
                )}
                {event.online_url && timing !== "past" && (
                  <>
                    <dt>{t("joinOnline")}</dt>
                    <dd>
                      <a className="ed-link" href={event.online_url} rel="noopener noreferrer" target="_blank" style={{ wordBreak: "break-all" }}>{event.online_url}</a>
                    </dd>
                  </>
                )}
              </dl>
              {luma && timing !== "past" && (
                <div className="ed-stack" style={{ gap: "0.5rem" }}>
                  <a href={luma} target="_blank" rel="noopener noreferrer" className="ed-btn ed-btn-dark" style={{ width: "100%" }}>
                    {t("registerLuma")} ↗
                  </a>
                  <span className="ed-muted">{t("registerNote")}</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
