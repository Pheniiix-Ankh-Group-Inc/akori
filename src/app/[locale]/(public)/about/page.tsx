import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { EditorialImage, hasVisual } from "@/components/ui/EditorialImage"
import { FOUNDERS } from "@/components/about/FounderProfile"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const a = await getTranslations({ locale, namespace: "Site.about" })
  const t = await getTranslations({ locale, namespace: "Institutional.about" })
  // « À propos » seul : le gabarit ajoute déjà « | Black in Blockchain ».
  return { title: a("eyebrow"), description: t("intro") }
}

/**
 * À propos : page unique (anciennement /about + /fondateurs).
 * Présentation, prémisse (manifeste), démarche, activités et fondateurs.
 * /fondateurs redirige ici, ancre #fondateurs.
 */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "Institutional.about" })
  const p = await getTranslations({ locale, namespace: "Site.pages" })
  const a = await getTranslations({ locale, namespace: "Site.about" })
  const m = await getTranslations({ locale, namespace: "Manifesto" })
  const founders = await Promise.all(
    FOUNDERS.map(async (f) => {
      const ft = await getTranslations({ locale, namespace: f.ns })
      return { ...f, name: ft("name"), role: ft("role") }
    }),
  )
  const arrow = <span className="ed-arrow" aria-hidden="true">→</span>

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="ed-stack" style={{ maxWidth: "52rem", gap: "1.5rem" }}>
          <p className="ed-eyebrow">{t("eyebrow")}</p>
          <h1 className="ed-h1">{p("items.about.title")}</h1>
          <p className="ed-lede">{t("intro")}</p>
        </div>
      </section>
      {hasVisual("about") && (
        <div className="ed-wrap ed-hero-media">
          <EditorialImage name="about" locale={locale} ratio="21x9" sizes="(max-width: 1264px) 100vw, 1200px" priority />
        </div>
      )}

      <section className="ed-section ed-section-white" aria-labelledby="about-premise">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.75rem" }}>
          <h2 id="about-premise" className="ed-eyebrow">{a("premiseTitle")}</h2>
          <p className="ed-quote" dangerouslySetInnerHTML={{ __html: m.raw("quote") as string }} />
          <div className="ed-prose">
            <p dangerouslySetInnerHTML={{ __html: m.raw("body1") as string }} />
            <p dangerouslySetInnerHTML={{ __html: m.raw("body2") as string }} />
          </div>
        </div>
      </section>

      <section className="ed-section" aria-labelledby="about-approach">
        <div className="ed-wrap-narrow ed-stack" style={{ gap: "1.5rem" }}>
          <h2 id="about-approach" className="ed-h2">{t("approachTitle")}</h2>
          <div className="ed-prose"><p>{t("approachText")}</p></div>
        </div>
      </section>

      <section className="ed-section ed-section-white" aria-labelledby="about-activities">
        <div className="ed-wrap ed-stack" style={{ gap: "2rem" }}>
          <h2 id="about-activities" className="ed-h2">{t("activitiesTitle")}</h2>
          <div className="ed-pillars">
            {(
              [
                { k: "meet", href: "/evenements" },
                { k: "learn", href: "/resources" },
                { k: "observe", href: "/state_of_bib" },
              ] as const
            ).map((x, i) => (
              <article key={x.k} className="ed-pillar">
                <span className="ed-num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="ed-h3">{t(`${x.k}Title`)}</h3>
                <p className="text-sm">{t(`${x.k}Text`)}</p>
                <Link className="ed-link" href={x.href} style={{ alignSelf: "flex-start", marginTop: "auto" }}>
                  {t(`${x.k}Link`)}&nbsp;{arrow}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="fondateurs" className="ed-section" aria-labelledby="about-founders">
        <div className="ed-wrap">
          <h2 id="about-founders" className="ed-h2" style={{ marginBottom: "3rem" }}>{a("foundersTitle")}</h2>
          <div className="ed-founders">
            {founders.map((f) => (
              <article key={f.slug} className="ed-founder-item">
                <div className="ed-portrait">
                  <Image src={f.image} alt={f.name} fill sizes="(max-width: 768px) 100vw, 590px" style={{ objectFit: "cover", objectPosition: "center 25%" }} />
                </div>
                <h3 className="ed-h3" style={{ fontSize: "1.75rem" }}>
                  <Link href={`/fondateurs/${f.slug}`}>{f.name}</Link>
                </h3>
                <span className="text-sm" style={{ maxWidth: "30rem" }}>{f.role}</span>
                <div className="ed-row" style={{ gap: "0.25rem 1.5rem" }}>
                  <Link href={`/fondateurs/${f.slug}`} className="ed-link">
                    {a("readProfile")}&nbsp;{arrow}
                  </Link>
                  <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="ed-link" aria-label={a("linkedinOf", { name: f.name })}>
                    {a("linkedin")} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ed-section ed-section-sand">
        <div className="ed-wrap ed-row" style={{ justifyContent: "space-between", gap: "1.5rem" }}>
          <p className="ed-h2" style={{ maxWidth: "38rem" }}>{a("ctaTitle")}</p>
          <div className="ed-row" style={{ gap: "0.75rem" }}>
            <Link href="/evenements" className="ed-btn ed-btn-dark">{a("ctaEvents")}</Link>
            <Link href="/mission" className="ed-btn ed-btn-line">{t("missionLink")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
