import Link from "next/link"
import { useTranslations } from "next-intl"

export default function CookiesPage() {
  const t = useTranslations("cookies")

  return (
    <main>
      <section className="section">
        <div className="wrap-sm">

          {/* Header */}
          <div
            style={{
              marginBottom: "4rem",
              paddingBottom: "2rem",
              borderBottom: "1px solid var(--border)"
            }}
          >
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

          {/* Content */}
          <div className="legal-content">

            {/* 1 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.intro.title")}</h2>
              <p className="text-base">{t("sections.intro.p1")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                {t("sections.intro.p2")}
              </p>
            </div>

            {/* 2 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.usage.title")}</h2>

              <p className="text-base">{t("sections.usage.intro")}</p>

              {["essential", "analytics", "personalization", "security"].map((key) => (
                <p key={key} className="text-base" style={{ marginTop: "1rem" }}>
                  <strong>{t(`sections.usage.${key}Title`)}</strong>{" "}
                  {t(`sections.usage.${key}`)}
                </p>
              ))}
            </div>

            {/* 3 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.types.title")}</h2>

              {["necessary", "analytics", "functional", "thirdparty"].map((key) => (
                <p key={key} className="text-base" style={{ marginTop: "1rem" }}>
                  <strong>{t(`sections.types.${key}Title`)}</strong>{" "}
                  {t(`sections.types.${key}`)}
                </p>
              ))}
            </div>

            {/* 5 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.choices.title")}</h2>

              <p className="text-base">{t("sections.choices.p1")}</p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong>{t("sections.choices.browserTitle")}</strong>{" "}
                {t("sections.choices.browser")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong>{t("sections.choices.bannerTitle")}</strong>{" "}
                {t("sections.choices.banner")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                {t("sections.choices.p2")}
              </p>
            </div>

            {/* 6 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.changes.title")}</h2>
              <p className="text-base">{t("sections.changes.p1")}</p>
            </div>

            {/* 7 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.contact.title")}</h2>

              <p className="text-base">
                {t("sections.contact.p1")}{" "}
                <a
                  href="mailto:contact@anbachain.org"
                  style={{ color: "var(--accent)" }}
                >
                  contact@anbachain.org
                </a>
              </p>
            </div>

          </div>

        </div>
      </section>
    </main>
  )
}