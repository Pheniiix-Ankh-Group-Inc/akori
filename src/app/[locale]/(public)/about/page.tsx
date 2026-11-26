import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { PageHero } from "@/components/ui/PageHero"
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

  const activities = [
    { k: "meet", href: "/evenements" },
    { k: "learn", href: "/resources" },
    { k: "observe", href: "/state_of_bib" },
  ] as const

  return (
    <main>
      <PageHero locale={locale} eyebrow={t("eyebrow")} title={p("items.about.title")} lede={t("intro")} visual="sob">
        <Link href="/about#fondateurs" className="ed-btn ed-btn-dark">{a("foundersTitle")}</Link>
        <Link href="/mission" className="im-link">{t("missionLink")}</Link>
      </PageHero>

      <section className="im im-pad" aria-labelledby="about-premise" style={{ paddingBlock: "clamp(6rem, 16vh, 12rem)" }}>
        <div className="im-grid" style={{ rowGap: "clamp(2rem, 6vh, 4rem)" }}>
          <h2 id="about-premise" className="im-ey im-rv im-t8" style={{ gridColumn: "1 / span 2" }}>{a("premiseTitle")}</h2>
          <p className="im-t im-rv im-t8" style={{ gridColumn: "3 / span 9", fontSize: "clamp(2.25rem, 4.8vw, 5.75rem)", lineHeight: 1.05 }} dangerouslySetInnerHTML={{ __html: m.raw("quote") as string }} />
          <div className="ed-prose im-rv im-t8" style={{ gridColumn: "7 / span 5" }}>
            <p dangerouslySetInnerHTML={{ __html: m.raw("body1") as string }} />
            <p dangerouslySetInnerHTML={{ __html: m.raw("body2") as string }} />
          </div>
        </div>
      </section>

      <section className="im im-sand im-pad" aria-labelledby="about-approach" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem", marginBottom: "clamp(3rem, 8vh, 5rem)" }}>
          <h2 id="about-approach" className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 5" }}>{t("approachTitle")}</h2>
          <p className="im-p im-rv im-t8" style={{ gridColumn: "7 / span 5", fontSize: "1.1875rem" }}>{t("approachText")}</p>
        </div>
        <h3 id="about-activities" className="im-ey im-rv" style={{ marginBottom: "1.25rem" }}>{t("activitiesTitle")}</h3>
        <ul className="im-rows" aria-labelledby="about-activities">
          {activities.map((x, i) => (
            <li key={x.k} className="im-rv">
              <Link className="im-rowlink" href={x.href}>
                <span className="im-ey" style={{ gridColumn: "1 / span 2" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="im-t" style={{ gridColumn: "3 / span 4", fontSize: "clamp(1.75rem, 2.6vw, 3rem)" }}>{t(`${x.k}Title`)}</span>
                <span className="im-p" style={{ gridColumn: "7 / span 4", fontSize: "1rem" }}>{t(`${x.k}Text`)}</span>
                <span style={{ gridColumn: "11 / span 2", justifySelf: "end", display: "inline-flex", gap: "0.6rem", fontSize: "0.9375rem" }}>
                  {t(`${x.k}Link`)} <span className="im-arrow" aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="fondateurs" className="im im-pad" aria-labelledby="about-founders" style={{ paddingBlock: "clamp(6rem, 14vh, 11rem)", scrollMarginTop: "4rem" }}>
        <div className="im-grid" style={{ rowGap: "3.5rem", alignItems: "start" }}>
          <div className="im-rv im-t8" style={{ gridColumn: "1 / span 4", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 id="about-founders" className="im-t im-h2s">{a("foundersTitle")}</h2>
          </div>
          {founders.map((f, i) => (
            <article key={f.slug} className={i === 0 ? "im-fa" : "im-fa im-fb im-founder-b"} style={{ gridColumn: i === 0 ? "5 / span 4" : "9 / span 4", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={`im-img im-mk ${i === 0 ? "im-px" : ""}`} style={{ aspectRatio: "2 / 3" }}>
                <Image src={f.image} alt={f.name} fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 30vw" style={{ objectFit: "cover", objectPosition: "50% 22%" }} />
              </div>
              <h3 className="im-t" style={{ fontSize: "2.125rem" }}>
                <Link href={`/fondateurs/${f.slug}`}>{f.name}</Link>
              </h3>
              <p className="im-p" style={{ fontSize: "1rem" }}>{f.role}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
                <Link href={`/fondateurs/${f.slug}`} className="im-link">{a("readProfile")}</Link>
                <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="im-link" aria-label={a("linkedinOf", { name: f.name })}>
                  {a("linkedin")} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="im im-ink im-pad" style={{ paddingBlock: "clamp(5rem, 12vh, 9rem)" }}>
        <div className="im-grid" style={{ rowGap: "2rem", alignItems: "end" }}>
          <p className="im-t im-h2s im-rv im-t8" style={{ gridColumn: "1 / span 7" }}>{a("ctaTitle")}</p>
          <div className="im-rv im-t8" style={{ gridColumn: "9 / span 4", display: "flex", flexWrap: "wrap", gap: "1rem 1.75rem", alignItems: "center" }}>
            <Link href="/evenements" className="ed-btn im-btn-lt">{a("ctaEvents")}</Link>
            <Link href="/mission" className="im-link" style={{ color: "var(--accent-light)" }}>{t("missionLink")}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
