import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

/** 404 des pages publiques : rendue dans le gabarit (menu + pied de page). */
export default async function PublicNotFound() {
  const t = await getTranslations("Site.notFound")
  return (
    <main className="ed-wrap ed-stack" style={{ minHeight: "60svh", justifyContent: "center", alignItems: "flex-start", gap: "1.25rem", paddingTop: "6rem", paddingBottom: "6rem" }}>
      <p className="ed-eyebrow">404</p>
      <h1 className="ed-h1">{t("title")}</h1>
      <p className="ed-lede">{t("text")}</p>
      <div className="ed-hero-actions" style={{ justifyContent: "flex-start", alignItems: "center" }}>
        <Link href="/" className="ed-btn ed-btn-dark">{t("home")}</Link>
        <Link href="/evenements" className="ed-link">{t("events")} →</Link>
      </div>
    </main>
  )
}
