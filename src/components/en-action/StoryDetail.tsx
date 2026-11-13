import { getTranslations } from "next-intl/server"
import { intlLocale, pickLocalized, pickTranslation } from "@/lib/content/locales"
import type { PublicTestimonial, StoryRecord } from "@/lib/stories/types"
import type { MediaView } from "./types"
import { Gallery } from "./Gallery"

const LANG_NAMES: Record<string, string> = { fr: "français", en: "English", es: "español" }

/**
 * Rétrospective : vidéo phare (lecture au clic, sans son automatique),
 * récit, galerie et témoignages. Partagée par la page publique et l'aperçu.
 */
export async function StoryDetail({
  story,
  locale,
  media,
  testimonials,
  backLink,
  eventLink,
}: {
  story: StoryRecord
  locale: string
  media: Record<string, MediaView>
  testimonials: PublicTestimonial[]
  backLink?: React.ReactNode
  eventLink?: React.ReactNode
}) {
  const t = await getTranslations({ locale, namespace: "InAction" })
  const tr = pickTranslation(story.story_translations, locale)
  const video = story.featured_video_id ? media[story.featured_video_id] : undefined
  const cover = story.cover_media_id ? media[story.cover_media_id] : undefined
  const gallery = [...story.story_media]
    .sort((a, b) => a.position - b.position)
    .map((sm) => ({ media: media[sm.media_id], caption: pickLocalized(sm.caption, locale) }))
    .filter((g): g is { media: MediaView; caption: string } => !!g.media && g.media.kind === "image")

  return (
    <main>
      <section className="section">
        <div className="wrap-sm">
          <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            {backLink}
            <h1 className="heading-md">{tr?.value.title ?? story.slug}</h1>
            {story.occurred_on && (
              <p className="text-sm">
                {new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${story.occurred_on}T00:00:00Z`))}
              </p>
            )}
            {eventLink}
            {tr?.isFallback && (
              <p className="text-xs" style={{ marginTop: "0.5rem" }}>{t("translationFallback", { language: LANG_NAMES[tr.shownLocale] ?? tr.shownLocale })}</p>
            )}
          </div>

          {video ? (
            <figure style={{ margin: "0 0 2.5rem" }}>
              <video
                controls
                preload="none"
                playsInline
                crossOrigin="anonymous"
                poster={video.posterUrl ?? cover?.url ?? undefined}
                style={{ width: "100%", borderRadius: "var(--r)", background: "#000" }}
                aria-label={video.alt || t("videoLabel")}
              >
                <source src={video.url} type="video/mp4" />
                {video.subtitlesUrl && <track kind="subtitles" src={video.subtitlesUrl} srcLang={locale} label={locale.toUpperCase()} default />}
              </video>
              {video.credit && <figcaption className="text-xs">{t("credit")} : {video.credit}</figcaption>}
            </figure>
          ) : (
            cover && (
              // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
              <img src={cover.url} alt={cover.alt} loading="lazy" style={{ width: "100%", height: "auto", borderRadius: "var(--r)", marginBottom: "2.5rem" }} />
            )
          )}

          {tr?.value.summary && <p className="section-intro" style={{ marginBottom: "1.5rem" }}>{tr.value.summary}</p>}
          {tr?.value.body && <div className="legal-content" style={{ whiteSpace: "pre-line", marginBottom: "3rem" }}>{tr.value.body}</div>}

          {gallery.length > 0 && (
            <section aria-labelledby="gallery-title" style={{ marginBottom: "3rem" }}>
              <h2 id="gallery-title" className="heading-sm" style={{ marginBottom: "1.25rem" }}>{t("gallery")}</h2>
              <Gallery items={gallery} closeLabel="×" />
            </section>
          )}

          {testimonials.length > 0 && (
            <section aria-labelledby="testimonials-title">
              <h2 id="testimonials-title" className="heading-sm" style={{ marginBottom: "1.25rem" }}>{t("testimonials")}</h2>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                {testimonials.map((q) => (
                  <figure key={q.id} className="card" style={{ margin: 0, padding: "1.5rem" }}>
                    <blockquote lang={q.locale} className="text-italic" style={{ margin: 0 }}>« {q.quote} »</blockquote>
                    <figcaption className="text-sm" style={{ marginTop: "0.75rem" }}>
                      {q.author_name}{q.author_role ? ` · ${q.author_role}` : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}
