import { permanentRedirect } from "next/navigation"
import { getPathname } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

/**
 * Ancienne page « Fondateurs » : fusionnée dans /about (section #fondateurs).
 * Redirection permanente pour conserver les liens existants. Les profils
 * /fondateurs/brice et /fondateurs/fadjiah restent en place.
 */
export default async function FoundersRedirect({ params }: Props) {
  const { locale } = await params
  permanentRedirect(`${getPathname({ href: "/about", locale })}#fondateurs`)
}
