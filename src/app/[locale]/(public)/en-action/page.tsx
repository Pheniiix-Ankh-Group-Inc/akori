import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedStories } from "@/lib/stories/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { intlLocale, pickTranslation } from "@/lib/content/locales"
import type { StoryRecord } from "@/lib/stories/types"
import type { MediaView } from "@/components/en-action/types"

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "InAction" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

/** BIB en action : la rétrospective la plus récente en vedette, puis les autres. */
export default async function InActionPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "InAction" })
  const s = await getTranslations({ locale, namespace: "Site.inAction" })
  const { configured, stories, media, testimonials } = await getPublishedStories()
  const views = toPublicMediaViews(media, locale)
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: "UTC" })
  const [featured, ...rest] = stories

  const info = (st: StoryRecord) => {
    const tr = pickTranslation(st.story_translations, locale)
    const cover: MediaView | undefined = st.cover_media_id ? views[st.cover_media_id] : undefined
    const date = st.occurred_on ? dateFmt.format(new Date(`${st.occurred_on}T00:00:00Z`)) : null
    return { tr, cover, date }
  }

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "7rem", paddingBottom: "4rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{s("title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>

      <section className="ed-wrap" style={{ paddingBottom: "6rem" }} aria-labelledby="retros">
        <h2 id="retros" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("retrospectives")}</h2>
        {!configured && <p className="ed-note">{t("notConfigured")}</p>}
        {configured && stories.length === 0 && <p className="ed-note">{t("empty")}</p>}

        {featured && (() => {
          const { tr, cover, date } = info(featured)
          return (
            <Link href={`/en-action/${featured.slug}`} className="ed-card ed-featured" style={{ marginBottom: "1.25rem" }}>
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
                <img className="ed-card-media" src={cover.url} alt={cover.alt} loading="lazy" />
              )}
              <div className="ed-card-body" style={{ padding: "2.25rem", gap: "0.9rem", justifyContent: "center" }}>
                {date && <span className="ed-muted">{date}</span>}
                <span className="ed-h2">{tr?.value.title ?? featured.slug}</span>
                {tr?.value.summary && <span className="text-sm">{tr.value.summary}</span>}
                <span className="ed-link">{t("viewStory")} →</span>
              </div>
            </Link>
          )
        })()}

        {rest.length > 0 && (
          <div className="ed-grid">
            {rest.map((st) => {
              const { tr, cover, date } = info(st)
              return (
                <Link key={st.id} href={`/en-action/${st.slug}`} className="ed-card">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
                    <img className="ed-card-media" src={cover.url} alt={cover.alt} loading="lazy" />
                  )}
                  <div className="ed-card-body">
                    {date && <span className="ed-muted">{date}</span>}
                    <span className="ed-h3">{tr?.value.title ?? st.slug}</span>
                    {tr?.value.summary && <span className="text-sm">{tr.value.summary}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {testimonials.length > 0 && (
        <section className="ed-section ed-section-white" aria-labelledby="testimonials">
          <div className="ed-wrap">
            <h2 id="testimonials" className="ed-h2" style={{ marginBottom: "1.75rem" }}>{t("testimonials")}</h2>
            <div className="ed-grid">
              {testimonials.slice(0, 6).map((q) => (
                <figure key={q.id} className="ed-testimonial">
                  <blockquote lang={q.locale}>« {q.quote} »</blockquote>
                  <figcaption>{q.author_name}{q.author_role ? ` · ${q.author_role}` : ""}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ed-section">
        <div className="ed-wrap ed-row" style={{ justifyContent: "space-between", gap: "1.5rem" }}>
          <p className="ed-h3" style={{ fontSize: "1.75rem" }}>{s("ctaTitle")}</p>
          <Link href="/evenements" className="ed-btn ed-btn-dark">{s("ctaEvents")}</Link>
        </div>
      </section>
    </main>
  )
}
