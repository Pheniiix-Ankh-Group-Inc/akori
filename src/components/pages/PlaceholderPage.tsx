import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHero } from "@/components/ui/PageHero"

export const PLACEHOLDER_PAGES = ["about", "mission", "membership", "resources", "press", "contact"] as const
export type PlaceholderKey = (typeof PLACEHOLDER_PAGES)[number]

/**
 * Métadonnées d'une page en préparation : titre réel, mais page exclue de
 * l'indexation tant que son contenu n'est pas publié.
 */
export async function placeholderMetadata(locale: string, page: PlaceholderKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Site.pages" })
  return { title: t(`items.${page}.title`), description: t(`items.${page}.lede`), robots: { index: false, follow: true } }
}

/**
 * Page dont le contenu n'est pas encore fourni : titre, chapeau et mention
 * « en préparation ». Aucun contenu n'est inventé ; à remplacer quand les
 * textes seront validés.
 */
export async function PlaceholderPage({ locale, page }: { locale: string; page: PlaceholderKey }) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Site.pages" })
  const nav = await getTranslations({ locale, namespace: "Site.nav" })
  const footer = await getTranslations({ locale, namespace: "Site.footer" })

  const links = [
    { href: "/about", label: nav("about") },
    { href: "/evenements", label: nav("events") },
    { href: "/state_of_bib", label: nav("stateOfBib") },
    { href: "/#newsletter", label: footer("newsletter") },
  ]

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("draft")} title={t(`items.${page}.title`)} lede={t(`items.${page}.lede`)} visual={page === "membership" ? "home" : undefined}>
        <p className="ed-note" style={{ margin: 0 }}>{t("note")}</p>
      </PageHero>
      <section className="im im-ink im-pad" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }} aria-labelledby="placeholder-meanwhile">
        <h2 id="placeholder-meanwhile" className="im-ey im-rv" style={{ marginBottom: "2rem" }}>{t("meanwhile")}</h2>
        <ul className="im-rows" style={{ borderColor: "#5A554C" }}>
          {links.map((l, i) => (
            <li key={l.href} className="im-rv" style={{ borderColor: "#5A554C" }}>
              <Link className="im-rowlink" href={l.href} style={{ color: "var(--bg)" }}>
                <span className="im-ey" style={{ gridColumn: "1 / span 2" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="im-t" style={{ gridColumn: "3 / span 8", fontSize: "clamp(1.75rem, 3vw, 3.5rem)" }}>{l.label}</span>
                <span className="im-arrow" style={{ gridColumn: "12", justifySelf: "end", fontSize: "1.5rem" }} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
