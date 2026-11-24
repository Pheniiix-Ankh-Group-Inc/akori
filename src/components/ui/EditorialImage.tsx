import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { visual, type VisualKey } from "@/lib/editorial/visuals"

type Ratio = "21x9" | "3x1" | "4x5" | "4x3"

/**
 * Visuel éditorial optimisé (AVIF/WebP via next/image, dimensions réservées).
 * Ne rend rien tant que le fichier HD n'est pas déposé (voir visuals.ts).
 */
export async function EditorialImage({
  name,
  locale,
  ratio,
  sizes,
  priority = false,
  className,
}: {
  name: VisualKey
  locale: string
  ratio: Ratio
  sizes: string
  priority?: boolean
  className?: string
}) {
  const v = visual(name)
  if (!v?.file) return null
  const t = await getTranslations({ locale, namespace: "Visuals" })
  return (
    <div className={`ed-media ed-media-${ratio}${className ? ` ${className}` : ""}`}>
      <Image src={v.file} alt={t(v.alt)} fill sizes={sizes} priority={priority} fetchPriority={priority ? "high" : undefined} />
    </div>
  )
}

export function hasVisual(name: VisualKey): boolean {
  return visual(name) !== null
}
