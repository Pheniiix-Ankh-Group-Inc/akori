import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

const BIO_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const

export const FOUNDERS = [
  { slug: "fadjiah", ns: "fadjiah", image: "/images/fadjiah_collin_mazile.jpg", linkedin: "https://www.linkedin.com/in/fadjiahcollin" },
  { slug: "brice", ns: "brice", image: "/images/brice_mimifir.jpg", linkedin: "https://www.linkedin.com/in/brice-mimifir" },
] as const

/** Profil d'un fondateur : photo, nom, rôle et biographie (textes existants). */
export async function FounderProfile({ locale, ns }: { locale: string; ns: "brice" | "fadjiah" }) {
  const { image, linkedin } = FOUNDERS.find((f) => f.ns === ns)!
  const t = await getTranslations({ locale, namespace: ns })
  const s = await getTranslations({ locale, namespace: "Site.about" })
  const paragraphs = BIO_KEYS.map((k) => t(`bio.${k}`)).filter((p) => p.trim() !== "")

  return (
    <main className="im">
      <article className="fp" aria-labelledby="fp-name">
        <div className="fp-portrait im-mk">
          <Image src={image} alt={t("name")} fill priority sizes="(max-width: 1279px) 100vw, 42vw" style={{ objectFit: "cover", objectPosition: "center 22%" }} />
        </div>
        <div className="fp-copy">
          <Link href="/about#fondateurs" className="im-link" style={{ alignSelf: "flex-start", fontSize: "0.9375rem" }}>← {s("back")}</Link>
          <p className="im-ey">{s("founder")}</p>
          <h1 id="fp-name" className="ph-title fp-name"><span className="im-line"><span>{t("name")}</span></span></h1>
          <p className="fp-role im-rv">{t("role")}</p>
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="im-link im-rv" style={{ alignSelf: "flex-start" }} aria-label={s("linkedinOf", { name: t("name") })}>
            {s("linkedin")} ↗
          </a>
          <div className="ed-prose fp-bio">
            {paragraphs.map((p, i) => <p key={i} className="im-rv">{p}</p>)}
          </div>
        </div>
      </article>
    </main>
  )
}
