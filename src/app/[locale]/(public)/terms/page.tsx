import Link from "next/link"
import { useTranslations } from "next-intl"

export default function TermsPage() {
  const t = useTranslations("terms")

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

            {/* 1. Publisher */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.publisher.title")}
              </h2>

              <p className="text-base">
                <strong className="legal-strong">
                  {t("sections.publisher.content.organization")}
                </strong>{" "}
                ANBACHAIN
                <br />

                <strong className="legal-strong">
                  {t("sections.publisher.content.legalForm")}
                </strong>{" "}
                Non-profit organization (OBNL) registered in Canada
                <br />

                <strong className="legal-strong">
                  {t("sections.publisher.content.registration")}
                </strong>{" "}
                <br />

                <strong className="legal-strong">
                  {t("sections.publisher.content.office")}
                </strong>{" "}
                <br />

                <strong className="legal-strong">
                  {t("sections.publisher.content.email")}
                </strong>{" "}
                contact@anbachain.org
                <br />

                <strong className="legal-strong">
                  {t("sections.publisher.content.representative")}
                </strong>
              </p>
            </div>

            {/* 2. Hosting */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.hosting.title")}
              </h2>

              <p className="text-base">
                <strong className="legal-strong">
                  {t("sections.hosting.frontend")}
                </strong>
                <br />
                Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, United States
                <br />
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  vercel.com
                </a>
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">
                  {t("sections.hosting.backend")}
                </strong>
                <br />
                Supabase Inc.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">
                  {t("sections.hosting.backend")}
                </strong>
                <br />
                AWS
              </p>
            </div>

            {/* 3. IP */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.ip.title")}
              </h2>

              <p className="text-base">
                {t("sections.ip.p1")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                {t("sections.ip.p2")}
              </p>
            </div>

            {/* 4. Liability */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.liability.title")}
              </h2>

              <p className="text-base">
                {t("sections.liability.p1")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                {t("sections.liability.p2")}
              </p>
            </div>

            {/* 5. Financial */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.financial.title")}
              </h2>

              <p className="text-base">
                {t("sections.financial.p1")}
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                {t("sections.financial.p2")}
              </p>
            </div>

            {/* 6. Law */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.law.title")}
              </h2>

              <p className="text-base">
                {t("sections.law.p1")}
              </p>
            </div>

            {/* 7. Modifications */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.modifications.title")}
              </h2>

              <p className="text-base">
                {t("sections.modifications.p1")}
              </p>
            </div>

            {/* 8. Contact */}
            <div className="legal-section">
              <h2 className="legal-heading">
                {t("sections.contact.title")}
              </h2>

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

          {/* Footer */}
          <div
            style={{
              marginTop: "4rem",
              paddingTop: "2rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap"
            }}
          />
        </div>
      </section>
    </main>
  )
}