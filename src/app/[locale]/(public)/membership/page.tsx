import { setRequestLocale } from "next-intl/server"
import { redirect } from "@/i18n/navigation"

type Props = { params: Promise<{ locale: string }> }

/** Page sans contenu validé : redirigée vers « À propos ». */
export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: "/fondateurs", locale })
}
