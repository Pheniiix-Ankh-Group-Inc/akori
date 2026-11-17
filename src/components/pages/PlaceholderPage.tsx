import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"

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

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <span className="ed-pill" style={{ alignSelf: "flex-start" }}>{t("draft")}</span>
          <h1 className="ed-h1">{t(`items.${page}.title`)}</h1>
          <p className="ed-lede">{t(`items.${page}.lede`)}</p>
          <p className="ed-note">{t("note")}</p>
        </div>
      </section>

      <section className="ed-section ed-section-white">
        <div className="ed-wrap ed-stack" style={{ gap: "1.25rem" }}>
          <h2 className="ed-eyebrow">{t("meanwhile")}</h2>
          <div className="ed-row" style={{ gap: "0.75rem" }}>
            <Link href="/fondateurs" className="ed-btn ed-btn-line">{nav("about")}</Link>
            <Link href="/evenements" className="ed-btn ed-btn-line">{nav("events")}</Link>
            <Link href="/state_of_bib" className="ed-btn ed-btn-line">{nav("stateOfBib")}</Link>
            <Link href="/#newsletter" className="ed-btn ed-btn-dark">{footer("newsletter")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
