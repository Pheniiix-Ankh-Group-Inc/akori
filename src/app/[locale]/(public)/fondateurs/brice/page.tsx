import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { FounderProfile } from "@/components/about/FounderProfile"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "brice" })
  return { title: t("name"), description: t("role") }
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <FounderProfile locale={locale} ns="brice" image="/images/brice_mimifir.jpg" />
}
