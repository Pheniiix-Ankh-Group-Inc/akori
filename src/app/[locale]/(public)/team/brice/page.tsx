import { getTranslations } from "next-intl/server"
import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Brice Mimifir — Fondateurs — AnbaChain",
  description:
    "Brice Mimifir — Java Developer, Digital Transformation Consultant & Blockchain Developer.",
}


const BIO_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const

export default async function BricePage() {
  const t = await getTranslations("brice")

  return (
      <section className="section">
        <div className="wrap">

          {/* ── Hero ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "3rem",
              alignItems: "center",
              marginBottom: "4rem",
            }}
            className="fondateur-grid"
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 420,
                aspectRatio: "3 / 4",
                overflow: "hidden",
                margin: "0 auto",
              }}
            >
              <Image
                src="/images/brice_mimifir.jpg"
                alt={t("name")}
                fill
                priority
                style={{ objectFit: "cover" }}
              />
            </div>

            {/* Name + title */}
            <div>
              <p className="label" style={{ marginBottom: "1rem" }}>
                {t("label")}
              </p>
              <h1 className="heading-md" style={{ marginBottom: "1rem" }}>
                {t("name")}
              </h1>
              <p className="text-base" style={{ color: "var(--texte-2)" }}>
                {t("role")}
              </p>
            </div>
          </div>

          {/* ── Bio ── */}
          <div className="wrap-sm" style={{ margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2rem",
                paddingTop: "3rem",
                borderTop: "1px solid var(--border)",
              }}
            >

              {BIO_KEYS.map((key) => (
                <p key={key} className="text-base">
                  {t(`bio.${key}`)}
                </p>
              ))}
            </div>

            {/* Footer nav */}
            <div
              style={{
                marginTop: "4rem",
                paddingTop: "2rem",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: "2rem",
                flexWrap: "wrap",
              }}
            >
              <Link href="/fondateurs" className="label">
                {t("footerNav")}
              </Link>
            </div>
          </div>
        </div>

          <style>{`
            @media (min-width: 768px) {
              .fondateur-grid {
                grid-template-columns: 420px 1fr !important;
              }
            }
          `}</style>
      </section>
  )
}
