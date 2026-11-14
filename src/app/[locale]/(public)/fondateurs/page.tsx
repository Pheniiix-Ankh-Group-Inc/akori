import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { FOUNDERS } from "@/components/about/FounderProfile"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Site.about" })
  return { title: t("eyebrow"), description: t("title") }
}

/** À propos : prémisse (textes du manifeste) et fondateurs. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Site.about" })
  const m = await getTranslations({ locale, namespace: "Manifesto" })
  const founders = await Promise.all(
    FOUNDERS.map(async (f) => {
      const ft = await getTranslations({ locale, namespace: f.ns })
      return { ...f, name: ft("name"), role: ft("role") }
    }),
  )

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{t("title")}</h1>
        </div>
      </section>

      <section className="ed-section ed-section-white" aria-labelledby="about-premise">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.75rem" }}>
          <h2 id="about-premise" className="ed-eyebrow">{t("premiseTitle")}</h2>
          <p className="ed-quote" dangerouslySetInnerHTML={{ __html: m.raw("quote") as string }} />
          <div className="ed-prose">
            <p dangerouslySetInnerHTML={{ __html: m.raw("body1") as string }} />
            <p dangerouslySetInnerHTML={{ __html: m.raw("body2") as string }} />
          </div>
        </div>
      </section>

      <section className="ed-section" aria-labelledby="about-founders">
        <div className="ed-wrap">
          <h2 id="about-founders" className="ed-h2" style={{ marginBottom: "2rem" }}>{t("foundersTitle")}</h2>
          <div className="ed-grid">
            {founders.map((f) => (
              <Link key={f.slug} href={`/fondateurs/${f.slug}`} className="ed-card ed-founder">
                <div className="ed-portrait ed-portrait-card">
                  <Image src={f.image} alt={f.name} fill sizes="(max-width: 768px) 100vw, 220px" style={{ objectFit: "cover", objectPosition: "center 25%" }} />
                </div>
                <div className="ed-card-body">
                  <span className="ed-h3">{f.name}</span>
                  <span className="text-sm">{f.role}</span>
                  <span className="ed-link" style={{ marginTop: "auto" }}>{t("readProfile")} →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ed-section ed-section-white">
        <div className="ed-wrap ed-row" style={{ justifyContent: "space-between", gap: "1.5rem" }}>
          <p className="ed-h3" style={{ fontSize: "1.75rem" }}>{t("ctaTitle")}</p>
          <div className="ed-row" style={{ gap: "0.75rem" }}>
            <Link href="/evenements" className="ed-btn ed-btn-dark">{t("ctaEvents")}</Link>
            <Link href="/#newsletter" className="ed-btn ed-btn-line">{t("ctaNewsletter")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
