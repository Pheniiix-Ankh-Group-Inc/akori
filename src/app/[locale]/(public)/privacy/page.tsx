import Link from "next/link"
import { useTranslations } from "next-intl"

export default function PrivacyPage() {
  const t = useTranslations("privacy")

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
              <h2 className="legal-heading">{t("sections.collect.title")}</h2>

              <p className="text-base">{t("sections.collect.intro")}</p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong>{t("sections.collect.providedTitle")}</strong>{" "}
                {t("sections.collect.provided")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong>{t("sections.collect.contentTitle")}</strong>{" "}
                {t("sections.collect.content")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong>{t("sections.collect.autoTitle")}</strong>{" "}
                {t("sections.collect.auto")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong>{t("sections.collect.web3Title")}</strong>{" "}
                {t("sections.collect.web3")}
              </p>
            </div>

            {/* 2 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.usage.title")}</h2>

              <p className="text-base">{t("sections.usage.intro")}</p>

              {[
                "p1","p2","p3","p4","p5","p6","p7"
              ].map((key) => (
                <p key={key} className="text-base">
                  • {t(`sections.usage.${key}`)}
                </p>
              ))}
            </div>

            {/* 3 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.sharing.title")}</h2>

              <p className="text-base">{t("sections.sharing.p1")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.sharing.p2")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.sharing.p3")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.sharing.p4")}</p>
            </div>

            {/* 4 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.blockchain.title")}</h2>

              <p className="text-base">{t("sections.blockchain.p1")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.blockchain.p2")}</p>
            </div>

            {/* 5 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.transfer.title")}</h2>

              <p className="text-base">{t("sections.transfer.p1")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.transfer.p2")}</p>
            </div>

            {/* 6 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.security.title")}</h2>

              <p className="text-base">{t("sections.security.p1")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.security.p2")}</p>
              <p className="text-base" style={{ marginTop: "1rem" }}>{t("sections.security.p3")}</p>
            </div>

            {/* 7 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.rights.title")}</h2>

              <p className="text-base">{t("sections.rights.intro")}</p>

              {["r1","r2","r3","r4","r5","r6"].map((key) => (
                <p key={key} className="text-base">
                  • {t(`sections.rights.${key}`)}
                </p>
              ))}
            </div>

            {/* 8 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.retention.title")}</h2>
              <p className="text-base">{t("sections.retention.p1")}</p>
            </div>

            {/* 9 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.links.title")}</h2>
              <p className="text-base">{t("sections.links.p1")}</p>
            </div>

            {/* 10 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.changes.title")}</h2>
              <p className="text-base">{t("sections.changes.p1")}</p>
            </div>

            {/* 11 */}
            <div className="legal-section">
              <h2 className="legal-heading">{t("sections.contact.title")}</h2>

              <p className="text-base">
                {t("sections.contact.p1")}
                <a
                  href="mailto:contact@anbachain.org"
                  style={{ color: "var(--accent)", marginLeft: "0.5rem" }}
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