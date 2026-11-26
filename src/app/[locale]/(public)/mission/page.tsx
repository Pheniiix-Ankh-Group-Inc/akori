import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHero } from "@/components/ui/PageHero"
import { AxesScrolly, type Axis } from "@/components/home/AxesScrolly"
import { visual } from "@/lib/editorial/visuals"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const p = await getTranslations({ locale, namespace: "Site.pages" })
  const t = await getTranslations({ locale, namespace: "Institutional.mission" })
  return { title: p("items.mission.title"), description: t("intro") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.mission" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })

  const vt = await getTranslations({ locale, namespace: "Visuals" })
  const pic = (key: "events" | "newsletter" | "home") => {
    const v = visual(key)
    return v ? { src: v.desktop.src, alt: vt(key), focus: v.focus } : null
  }
  const axes: Axis[] = [
    { key: "connect", title: t("connectTitle"), text: t("connectText"), link: t("eventsLink"), href: "/evenements", image: pic("events") },
    { key: "share", title: t("shareTitle"), text: t("shareText"), link: p("items.resources.title"), href: "/resources", image: pic("newsletter") },
    { key: "highlight", title: t("highlightTitle"), text: t("highlightText"), link: "Startup Spotlight", href: "/startup-spotlight", image: pic("home") },
  ]

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("eyebrow")} title={p("items.mission.title")} lede={t("intro")} visual="about" variant="cinematic" />
      <section className="im" aria-labelledby="home-axes">
        <AxesScrolly axes={axes} eyebrow={t("eyebrow")} heading={t("pillarsTitle")} />
      </section>
      <section className="im im-ink im-pad" aria-labelledby="mission-method" style={{ paddingBlock: "clamp(6rem, 14vh, 11rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem" }}>
          <h2 id="mission-method" className="im-t im-h2 im-rv im-t8" style={{ gridColumn: "1 / span 6" }}>{t("methodTitle")}</h2>
          <div className="im-rv im-t8" style={{ gridColumn: "8 / span 5", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <p className="im-p" style={{ fontSize: "1.1875rem" }}>{t("methodText")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.75rem", alignItems: "center" }}>
              <Link className="ed-btn im-btn-lt" href="/evenements">{t("eventsLink")}</Link>
              <Link className="im-link" href="/data-sources" style={{ color: "var(--accent-light)" }}>{t("sourcesLink")}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
