import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

const BIO_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const

export const FOUNDERS = [
  { slug: "fadjiah", ns: "fadjiah", image: "/images/fadjiah_collin_mazile.jpg" },
  { slug: "brice", ns: "brice", image: "/images/brice_mimifir.jpg" },
] as const

/** Profil d'un fondateur : photo, nom, rôle et biographie (textes existants). */
export async function FounderProfile({ locale, ns, image }: { locale: string; ns: "brice" | "fadjiah"; image: string }) {
  const t = await getTranslations({ locale, namespace: ns })
  const s = await getTranslations({ locale, namespace: "Site.about" })
  const paragraphs = BIO_KEYS.map((k) => t(`bio.${k}`)).filter((p) => p.trim() !== "")

  return (
    <main>
      <section className="ed-wrap" style={{ paddingTop: "4rem", paddingBottom: "6rem" }}>
        <Link href="/fondateurs" className="ed-link" style={{ display: "inline-block", marginBottom: "2.5rem" }}>← {s("back")}</Link>
        <div className="ed-profile">
          <div className="ed-portrait">
            <Image src={image} alt={t("name")} fill priority sizes="(max-width: 768px) 100vw, 380px" style={{ objectFit: "cover", objectPosition: "center 25%" }} />
          </div>
          <div className="ed-stack" style={{ gap: "1.5rem" }}>
            <p className="ed-eyebrow">{s("founder")}</p>
            <h1 className="ed-h1">{t("name")}</h1>
            <p className="ed-lede" style={{ fontSize: "1.15rem" }}>{t("role")}</p>
            <div className="ed-prose" style={{ borderTop: "1px solid var(--border)", paddingTop: "2rem", marginTop: "0.5rem" }}>
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
