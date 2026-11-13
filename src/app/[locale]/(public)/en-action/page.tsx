import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getPublishedStories } from "@/lib/stories/queries"
import { toPublicMediaViews } from "@/lib/stories/media-views"
import { pickTranslation } from "@/lib/content/locales"
import { Gallery } from "@/components/en-action/Gallery"

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "InAction" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

export default async function InActionPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "InAction" })
  const { configured, stories, media, testimonials } = await getPublishedStories()
  const views = toPublicMediaViews(media, locale)
  const gallery = stories
    .flatMap((s) => [...s.story_media].sort((a, b) => a.position - b.position))
    .map((sm) => views[sm.media_id])
    .filter((m) => m && m.kind === "image")
    .slice(0, 24)
    .map((m) => ({ media: m, caption: m.alt }))

  return (
    <main>
      <section className="section">
        <div className="wrap-sm">
          <div style={{ marginBottom: "3rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label">← Black in Blockchain</Link>
            <h1 className="heading-md">{t("title")}</h1>
            <p className="section-intro" style={{ marginTop: "1rem" }}>{t("intro")}</p>
          </div>

          {!configured && <p className="text-sm">{t("notConfigured")}</p>}
          {configured && stories.length === 0 && <p className="text-sm">{t("empty")}</p>}

          {stories.length > 0 && (
            <section aria-labelledby="retros" style={{ marginBottom: "4rem" }}>
              <h2 id="retros" className="heading-sm" style={{ marginBottom: "1.5rem" }}>{t("retrospectives")}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
                {stories.map((s) => {
                  const tr = pickTranslation(s.story_translations, locale)
                  const cover = s.cover_media_id ? views[s.cover_media_id] : undefined
                  return (
                    <article key={s.id} className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage
                        <img src={cover.url} alt={cover.alt} loading="lazy" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover" }} />
                      )}
                      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {s.occurred_on && <span className="text-xs">{s.occurred_on}</span>}
                        <h3 className="heading-xs" style={{ margin: 0 }}>
                          <Link href={`/en-action/${s.slug}`}>{tr?.value.title ?? s.slug}</Link>
                        </h3>
                        {tr?.value.summary && <p className="text-sm" style={{ margin: 0 }}>{tr.value.summary}</p>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section aria-labelledby="gallery" style={{ marginBottom: "4rem" }}>
              <h2 id="gallery" className="heading-sm" style={{ marginBottom: "1.5rem" }}>{t("gallery")}</h2>
              <Gallery items={gallery} closeLabel="×" />
            </section>
          )}

          {testimonials.length > 0 && (
            <section aria-labelledby="testimonials">
              <h2 id="testimonials" className="heading-sm" style={{ marginBottom: "1.5rem" }}>{t("testimonials")}</h2>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                {testimonials.slice(0, 6).map((q) => (
                  <figure key={q.id} className="card" style={{ margin: 0, padding: "1.5rem" }}>
                    <blockquote lang={q.locale} className="text-italic" style={{ margin: 0 }}>« {q.quote} »</blockquote>
                    <figcaption className="text-sm" style={{ marginTop: "0.75rem" }}>{q.author_name}{q.author_role ? ` · ${q.author_role}` : ""}</figcaption>
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
