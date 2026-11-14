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
      <section className="ed-wrap" style={{ paddingTop: "4rem", paddingBottom: "3rem" }}>
        {backLink && <div style={{ marginBottom: "2rem" }}>{backLink}</div>}
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1rem" }}>
          {story.occurred_on && (
            <p className="ed-eyebrow">
              {new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${story.occurred_on}T00:00:00Z`))}
            </p>
          )}
          <h1 className="ed-h1">{tr?.value.title ?? story.slug}</h1>
          {tr?.value.summary && <p className="ed-lede">{tr.value.summary}</p>}
          {eventLink}
          {tr?.isFallback && <p className="ed-muted">{t("translationFallback", { language: LANG_NAMES[tr.shownLocale] ?? tr.shownLocale })}</p>}
        </div>
      </section>

      <section className="ed-wrap" style={{ paddingBottom: "4rem" }}>
        {video ? (
          <figure className="ed-figure">
            <video
              className="ed-video"
              controls
              preload="none"
              playsInline
              crossOrigin="anonymous"
              poster={video.posterUrl ?? cover?.url ?? undefined}
              aria-label={video.alt || t("videoLabel")}
            >
              <source src={video.url} type="video/mp4" />
              {video.subtitlesUrl && <track kind="subtitles" src={video.subtitlesUrl} srcLang={locale} label={locale.toUpperCase()} default />}
            </video>
            {video.credit && <figcaption>{t("credit")} : {video.credit}</figcaption>}
          </figure>
        ) : (
          cover && (
            <figure className="ed-figure">
              {/* eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage */}
              <img src={cover.url} alt={cover.alt} loading="lazy" />
              {cover.credit && <figcaption>{t("credit")} : {cover.credit}</figcaption>}
            </figure>
          )
        )}
      </section>

      {tr?.value.body && (
        <section className="ed-wrap-narrow" style={{ paddingBottom: "5rem" }}>
          <div className="ed-prose" style={{ whiteSpace: "pre-line" }}>{tr.value.body}</div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="ed-section ed-section-white" aria-labelledby="gallery-title">
          <div className="ed-wrap">
            <h2 id="gallery-title" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("gallery")}</h2>
            <Gallery items={gallery} closeLabel="×" />
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="ed-section" aria-labelledby="testimonials-title">
          <div className="ed-wrap">
            <h2 id="testimonials-title" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("testimonials")}</h2>
            <div className="ed-grid">
              {testimonials.map((q) => (
                <figure key={q.id} className="ed-testimonial">
                  <blockquote lang={q.locale}>« {q.quote} »</blockquote>
                  <figcaption>{q.author_name}{q.author_role ? ` · ${q.author_role}` : ""}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
