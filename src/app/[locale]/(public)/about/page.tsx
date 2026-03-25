import Link from "next/link"
import { useTranslations } from "next-intl"

export default function TermsPage() {
  const t = useTranslations("terms")

  return (
    <main>
      <section className="section">
        <div className="wrap-sm">

          <div style={{ marginBottom: "4rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label">
              ← {t("header.back")}
            </Link>

            <h1 className="heading-md">
              {t("header.title")}
            </h1>

            <p className="text-xs" style={{ marginTop: "1rem" }}>
              {t("header.lastUpdated")}
            </p>
          </div>

        </div>
      </section>
    </main>
  )
}