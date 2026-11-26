import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHero } from "@/components/ui/PageHero"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const p = await getTranslations({ locale, namespace: "Site.pages" })
  const t = await getTranslations({ locale, namespace: "Institutional.contact" })
  return { title: p("items.contact.title"), description: t("intro") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.contact" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  const channels = [
    { k: "general", subject: "General" },
    { k: "partners", subject: "Partnership" },
    { k: "events", subject: "Events" },
    { k: "press", subject: "Press" },
  ] as const

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("eyebrow")} title={p("items.contact.title")} lede={t("intro")} tone="sand">
        <a className="im-link" href="mailto:contact@anbachain.org" style={{ fontSize: "1.25rem" }}>contact@anbachain.org</a>
      </PageHero>
      <section className="im im-pad" aria-labelledby="contact-channels" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "1.5rem", marginBottom: "clamp(2.5rem, 6vh, 4rem)", alignItems: "end" }}>
          <h2 id="contact-channels" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 7" }}>{t("channelsTitle")}</h2>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "9 / span 4" }}>{t("channelsText")}</p>
        </div>
        <ul className="im-rows">
          {channels.map((c, i) => (
            <li key={c.k} className="im-rv">
              <a className="im-rowlink" href={`mailto:contact@anbachain.org?subject=BIB%20-%20${c.subject}`}>
                <span className="im-ey" style={{ gridColumn: "1 / span 2" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="im-t" style={{ gridColumn: "3 / span 4", fontSize: "clamp(1.75rem, 2.6vw, 3rem)" }}>{t(`${c.k}Title`)}</span>
                <span className="im-p" style={{ gridColumn: "7 / span 4", fontSize: "1rem" }}>{t(`${c.k}Text`)}</span>
                <span style={{ gridColumn: "11 / span 2", justifySelf: "end", fontSize: "0.9375rem", display: "inline-flex", gap: "0.6rem" }}>
                  {t("writeLink")} <span className="im-arrow" aria-hidden="true">→</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="im im-ink im-pad" aria-labelledby="contact-direct" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem", alignItems: "end" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 7", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 id="contact-direct" className="im-ey">{t("directTitle")}</h2>
            <a className="im-t" href="mailto:contact@anbachain.org" style={{ fontSize: "clamp(2rem, 5vw, 5.5rem)", color: "var(--bg)", wordBreak: "break-word" }}>contact@anbachain.org</a>
          </div>
          <div className="im-rv im-t8" style={{ gridColumn: "9 / span 4", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p className="im-p">{t("privacyNote")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.75rem" }}>
              <Link className="im-link" href="/evenements" style={{ color: "var(--accent-light)" }}>{t("eventsLink")}</Link>
              <Link className="im-link" href="/privacy" style={{ color: "var(--accent-light)" }}>{t("privacyLink")}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
