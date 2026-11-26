import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHero } from "@/components/ui/PageHero"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const p = await getTranslations({ locale, namespace: "Site.pages" })
  const t = await getTranslations({ locale, namespace: "Institutional.press" })
  return { title: p("items.press.title"), description: t("intro") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.press" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  const topics = [
    { k: "stories", href: "/en-action" },
    { k: "events", href: "/evenements" },
    { k: "data", href: "/state_of_bib" },
  ] as const

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("eyebrow")} title={p("items.press.title")} lede={t("intro")} visual="newsletter">
        <a className="ed-btn ed-btn-dark" href="mailto:contact@anbachain.org?subject=BIB%20-%20Press">{t("emailLink")}</a>
      </PageHero>
      <section className="im im-pad" aria-labelledby="press-intro" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem", marginBottom: "clamp(2.5rem, 6vh, 4rem)" }}>
          <h2 id="press-intro" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 5" }}>{t("overviewTitle")}</h2>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "7 / span 5", fontSize: "1.1875rem" }}>{t("overviewText")}</p>
        </div>
        <ul className="im-rows">
          {topics.map((x, i) => (
            <li key={x.k} className="im-rv">
              <Link className="im-rowlink" href={x.href}>
                <span className="im-ey" style={{ gridColumn: "1 / span 2" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="im-t" style={{ gridColumn: "3 / span 4", fontSize: "clamp(1.75rem, 2.6vw, 3rem)" }}>{t(`${x.k}Title`)}</span>
                <span className="im-p" style={{ gridColumn: "7 / span 5", fontSize: "1rem" }}>{t(`${x.k}Text`)}</span>
                <span className="im-arrow" style={{ gridColumn: "12", justifySelf: "end" }} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="im im-ink im-pad" aria-labelledby="press-contact" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem" }}>
          <h2 id="press-contact" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 6" }}>{t("contactTitle")}</h2>
          <div className="im-rv im-t8" style={{ gridColumn: "8 / span 5", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p className="im-p" style={{ fontSize: "1.1875rem" }}>{t("contactText")}</p>
            <p className="im-p" style={{ fontSize: "0.9375rem" }}>{t("assetsNote")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.75rem", alignItems: "center" }}>
              <a className="ed-btn im-btn-lt" href="mailto:contact@anbachain.org?subject=BIB%20-%20Press">{t("emailLink")}</a>
              <Link className="im-link" href="/contact" style={{ color: "var(--accent-light)" }}>{t("contactLink")}</Link>
            </div>
            <p className="im-p" style={{ fontSize: "0.9375rem" }}>contact@anbachain.org</p>
          </div>
        </div>
      </section>
    </main>
  )
}
