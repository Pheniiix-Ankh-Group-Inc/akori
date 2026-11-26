import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHero } from "@/components/ui/PageHero"
import { EditorialImage } from "@/components/ui/EditorialImage"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const p = await getTranslations({ locale, namespace: "Site.pages" })
  const t = await getTranslations({ locale, namespace: "Institutional.resources" })
  return { title: p("items.resources.title"), description: t("intro") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.resources" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  const items = [
    { k: "sources", href: "/data-sources" },
    { k: "events", href: "/evenements" },
    { k: "people", href: "/about#fondateurs" },
  ] as const

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("eyebrow")} title={p("items.resources.title")} lede={t("intro")} variant="index" />
      <section className="im im-pad" aria-labelledby="resources-explore" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "1.5rem", marginBottom: "clamp(2.5rem, 6vh, 4rem)", alignItems: "end" }}>
          <h2 id="resources-explore" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 6" }}>{t("exploreTitle")}</h2>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "8 / span 5" }}>{t("exploreText")}</p>
        </div>
        <Link href="/state_of_bib" className="im-grid im-rv" style={{ borderTop: "1px solid var(--blanc)", paddingBlock: "clamp(1.5rem, 3vh, 2.5rem)", rowGap: "1.25rem", alignItems: "center" }}>
          <div className="im-img im-t8" style={{ gridColumn: "1 / span 5", aspectRatio: "16 / 10" }}>
            <EditorialImage name="sob" locale={locale} ratio="fill" sizes="(max-width: 1279px) 100vw, 40vw" />
          </div>
          <div className="im-t8" style={{ gridColumn: "7 / span 5", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <p className="im-ey">01</p>
            <p className="im-t" style={{ fontSize: "clamp(2rem, 3.4vw, 4rem)" }}>{t("stateTitle")}</p>
            <p className="im-p">{t("stateText")}</p>
            <span className="im-link" style={{ alignSelf: "flex-start" }}>{t("openResource")}</span>
          </div>
        </Link>
        <ul className="im-rows">
          {items.map((x, i) => (
            <li key={x.k} className="im-rv">
              <Link className="im-rowlink" href={x.href}>
                <span className="im-ey" style={{ gridColumn: "1 / span 2" }}>{String(i + 2).padStart(2, "0")}</span>
                <span className="im-t" style={{ gridColumn: "3 / span 4", fontSize: "clamp(1.6rem, 2.2vw, 2.5rem)" }}>{t(`${x.k}Title`)}</span>
                <span className="im-p" style={{ gridColumn: "7 / span 4", fontSize: "1rem" }}>{t(`${x.k}Text`)}</span>
                <span style={{ gridColumn: "11 / span 2", justifySelf: "end", display: "inline-flex", gap: "0.6rem", fontSize: "0.9375rem" }}>
                  {t("openResource")} <span className="im-arrow" aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="im im-ink im-pad" aria-labelledby="resources-future" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "1.5rem", alignItems: "end" }}>
          <h2 id="resources-future" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 6" }}>{t("futureTitle")}</h2>
          <div className="im-rv im-t8" style={{ gridColumn: "8 / span 5", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p className="im-p">{t("futureText")}</p>
            <Link className="ed-btn im-btn-lt" href="/#newsletter" style={{ alignSelf: "flex-start" }}>{t("newsletterLink")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
