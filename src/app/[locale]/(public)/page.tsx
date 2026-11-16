import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { BibOverlays } from "@/components/bib/BibOverlays"
import { SectionHero } from "@/components/bib/SectionHero"
import { SectionMarquee } from "@/components/bib/SectionMarquee"
import { SectionManifesto } from "@/components/bib/SectionManifesto"
import { SectionConstellation } from "@/components/bib/SectionConstellation"
import { SectionCosmic } from "@/components/bib/SectionCosmic"
import { SectionLedger } from "@/components/bib/SectionLedger"
import { SectionPillars } from "@/components/bib/SectionPillars"
import { SectionData } from "@/components/bib/SectionData"
import { SectionOrgs } from "@/components/bib/SectionOrgs"
import { SectionNews } from "@/components/bib/SectionNews"
import { SectionPortraits } from "@/components/bib/SectionPortraits"
import { SectionChains } from "@/components/bib/SectionChains"
import { SectionGathering } from "@/components/bib/SectionGathering"
import { SectionStats } from "@/components/bib/SectionStats"
import { SectionCta } from "@/components/bib/SectionCta"
import { SectionTicker } from "@/components/bib/SectionTicker"

export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Meta" })
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="bib-root">
      <BibOverlays />
      <SectionHero />
      <SectionMarquee />
      <SectionManifesto />
      <SectionConstellation />
      <SectionCosmic />
      <SectionLedger />
      <SectionPillars />
      <SectionData />
      <SectionOrgs />
      <SectionNews />
      <SectionPortraits />
      <SectionChains />
      <SectionGathering />
      <SectionStats />
      <SectionCta />
      <SectionTicker />
    </main>
  )
}
