import type { Metadata } from "next"
import { PlaceholderPage, placeholderMetadata } from "@/components/pages/PlaceholderPage"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return placeholderMetadata(locale, "resources")
}

/** Page en préparation : contenu à fournir. */
export default async function Page({ params }: Props) {
  const { locale } = await params
  return <PlaceholderPage locale={locale} page="resources" />
}
