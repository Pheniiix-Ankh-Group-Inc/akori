import { getImageProps } from "next/image"
import { getTranslations } from "next-intl/server"
import { visual, type VisualKey } from "@/lib/editorial/visuals"

type Ratio = "21x9" | "3x1" | "4x5" | "4x3"

const RATIO_CLASS: Record<Ratio, string> = {
  "21x9": "ed-media-21x9",
  "3x1": "ed-media-3x1",
  "4x5": "ed-media-4x5",
  "4x3": "ed-media-4x3",
}

/**
 * Visuel éditorial optimisé : AVIF/WebP et srcset via next/image, ratio
 * réservé (pas de saut de mise en page), cadrage vertical dédié sous 768 px
 * quand il existe (<picture>), point focal sinon.
 * Ne rend rien tant que le fichier n'est pas validé et assez défini
 * (voir src/lib/editorial/visuals.ts et docs/IMAGES.md).
 */
export async function EditorialImage({
  name,
  locale,
  ratio,
  sizes,
  priority = false,
  bleed = false,
  className,
}: {
  name: VisualKey
  locale: string
  ratio: Ratio
  sizes: string
  priority?: boolean
  /** Bord à bord, sans arrondi : hero et bandeaux pleine largeur. */
  bleed?: boolean
  className?: string
}) {
  const v = visual(name)
  if (!v) return null
  const t = await getTranslations({ locale, namespace: "Visuals" })
  const alt = v.alt ? t(v.alt) : ""
  const common = {
    alt,
    fill: true,
    sizes,
    priority,
    fetchPriority: priority ? ("high" as const) : undefined,
  }
  const {
    props: { srcSet: desktopSrcSet, ...rest },
  } = getImageProps({ ...common, src: v.desktop.src })
  const mobileSrcSet = v.mobile ? getImageProps({ ...common, sizes: "100vw", src: v.mobile.src }).props.srcSet : undefined

  const classes = ["ed-media", RATIO_CLASS[ratio], bleed ? "ed-media-bleed" : "", className ?? ""].filter(Boolean).join(" ")
  return (
    <figure className="ed-figure">
      <div className={classes}>
        <picture>
          {mobileSrcSet && <source media="(max-width: 767px)" srcSet={mobileSrcSet} sizes="100vw" />}
          <source srcSet={desktopSrcSet} sizes={sizes} />
          <img {...rest} alt={alt} style={{ ...rest.style, objectPosition: v.focus }} />
        </picture>
      </div>
      {v.ambient && <figcaption className={bleed ? "ed-figcaption ed-wrap" : "ed-figcaption"}>{t("ambientCaption")}</figcaption>}
    </figure>
  )
}

export function hasVisual(name: VisualKey): boolean {
  return visual(name) !== null
}
