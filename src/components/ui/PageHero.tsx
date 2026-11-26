import type { ReactNode } from "react"
import type { VisualKey } from "@/lib/editorial/visuals"
import { EditorialImage, hasVisual } from "@/components/ui/EditorialImage"

/**
 * En-tête de page publique (système « Immersive Spatial Institution »).
 * - Avec un visuel validé : texte à gauche, photo bord à bord à droite
 *   (sous 1280 px, la photo passe sous le texte).
 * - Sans visuel : ouverture typographique, titre à gauche, introduction et
 *   actions dans une colonne à droite. Jamais de cadre vide.
 * Le titre monte ligne par ligne (.im-line) ; rien n'est masqué sans
 * animation ou avec « réduire les animations ».
 */
export async function PageHero({
  eyebrow,
  title,
  lede,
  visual,
  locale,
  tone = "ivory",
  children,
  id,
}: {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  visual?: VisualKey
  locale: string
  tone?: "ivory" | "sand" | "ink"
  children?: ReactNode
  id?: string
}) {
  const withImage = visual ? hasVisual(visual) : false
  const toneClass = tone === "ink" ? " ph-ink" : tone === "sand" ? " ph-sand" : ""
  const headingId = id ?? "page-title"
  const heading = (
    <h1 id={headingId} className="ph-title">
      <span className="im-line">
        <span>{title}</span>
      </span>
    </h1>
  )
  if (withImage && visual) {
    return (
      <header className={`ph im${toneClass}`} aria-labelledby={headingId}>
        <div className="ph-grid">
          <div className="ph-copy">
            <p className="im-ey">{eyebrow}</p>
            {heading}
            {lede && <div className="im-p im-rv" style={{ fontSize: "1.1875rem" }}>{lede}</div>}
            {children && <div className="im-rv" style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.75rem", alignItems: "center" }}>{children}</div>}
          </div>
          <div className="ph-media im-mk im-px" style={{ overflow: "hidden" }}>
            <EditorialImage name={visual} locale={locale} ratio="fill" sizes="(max-width: 1279px) 100vw, 50vw" priority />
          </div>
        </div>
      </header>
    )
  }
  return (
    <header className={`ph ph-plain im${toneClass}`} aria-labelledby={headingId}>
      <div className="ph-grid">
        <div className="ph-copy">
          <div className="ph-head">
            <p className="im-ey">{eyebrow}</p>
            {heading}
          </div>
          <div className="ph-side im-rv">
            {lede && <div className="im-p" style={{ fontSize: "1.125rem" }}>{lede}</div>}
            {children && <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem 1.75rem", alignItems: "center" }}>{children}</div>}
          </div>
        </div>
      </div>
    </header>
  )
}
