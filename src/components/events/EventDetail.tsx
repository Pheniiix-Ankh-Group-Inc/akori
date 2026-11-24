import { getTranslations } from "next-intl/server"
import { intlLocale, pickLocalized } from "@/lib/content/locales"
import { eventText, splitLumaDescription } from "@/lib/events/text"
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
  related,
}: {
  event: EventRecord
  locale: string
  coverUrl: string | null
  cover: PublicMedia | null
  backLink?: React.ReactNode
  related?: React.ReactNode
}) {
  const t = await getTranslations({ locale, namespace: "Events" })
  const s = await getTranslations({ locale, namespace: "Site.events" })
  const tx = eventText(event, locale)
  const tr = { value: tx, isFallback: tx.isFallback && tx.shownLocale !== "source", shownLocale: tx.shownLocale }
  const timing = eventTiming(event)
  const cancelled = event.source_status === "cancelled"
  const luma = cancelled ? null : normalizeLumaUrl(event.luma_url)
  const modeLabel = event.mode === "online" ? t("online") : event.mode === "hybrid" ? t("hybrid") : t("inPerson")
  // Adresse et organisateurs extraits du gabarit Luma, affichés avec des libellés traduits.
  const luma_ = splitLumaDescription(event.source_description)
  const place = [event.venue_name, event.address, event.city, event.country_code].filter(Boolean).join(", ") || event.source_location || luma_.address.join(", ")
  const loc = intlLocale(locale)
  const status = cancelled ? s("cancelled") : timing === "past" ? t("ended") : timing === "ongoing" ? t("ongoing") : modeLabel
  // Visuel : couverture BIB (droits vérifiés) sinon visuel public Luma.
  const imageUrl = coverUrl ?? event.source_image_url ?? null

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "4rem", paddingBottom: "6rem" }}>
        {backLink && <div style={{ marginBottom: "2rem" }}>{backLink}</div>}
        <div className="ed-stack" style={{ maxWidth: "52rem", marginBottom: "3rem" }}>
          <span className={cancelled ? "ed-pill ed-pill-danger" : timing === "ongoing" ? "ed-pill ed-pill-accent" : "ed-pill"} style={{ alignSelf: "flex-start" }}>{status}</span>
          <h1 className="ed-h1">{tr?.value.title ?? event.slug}</h1>
          {tr?.isFallback && (
            <p className="ed-muted">{t("translationFallback", { language: LANG_NAMES[tr.shownLocale] ?? tr.shownLocale })}</p>
          )}
          {tr?.value.summary && tx.shownLocale !== "source" && <p className="ed-lede">{tr.value.summary}</p>}
          {event.source === "luma" && <p className="ed-muted">{s("sourceNote")}</p>}
        </div>

        <div className="ed-detail">
          <div className="ed-stack" style={{ gap: "2rem" }}>
            {imageUrl && (
              <figure className="ed-figure">
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier Supabase Storage, dimensions variables */}
                <img src={imageUrl} alt={coverUrl ? pickLocalized(cover?.alt_text, locale) : ""} loading="lazy" />
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
                {luma_.hosts && (
                  <>
                    <dt>{t("hosts")}</dt>
                    <dd>{luma_.hosts}</dd>
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
      {related}
    </main>
  )
}
