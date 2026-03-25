import { sanityFetch } from "@/sanity/lib/live";
import type { Metadata } from "next";
import { Suspense } from "react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { ErrorPage } from "@/components/ErrorPage"

import {
  EVENEMENTS_QUERY,
  EVENEMENT_FEATURED_QUERY,
  RESSOURCES_QUERY,
  PARTENAIRES_QUERY
} from "@/lib/queries"

import type { Evenement, Ressource, Partenaire } from "@/types"

import { SectionAdhesion } from "@/components/sections/Sectionadhesion";
import { SectionEquipe } from "@/components/sections/Sectionequipe";
import { SectionEspace } from "@/components/sections/Sectionespace";
import { SectionEvenements } from "@/components/sections/Sectionevenements";
import { SectionHero } from "@/components/sections/Sectionhero";
import { SectionInterstitiel } from "@/components/sections/Sectioninterstitiel";
import { SectionMission } from "@/components/sections/Sectionmission";
import { SectionPartenaires } from "@/components/sections/Sectionpartenaires";
import { SectionRessources } from "@/components/sections/Sectionressources";
import { SectionStorytelling } from "@/components/sections/Sectionstorytelling";
import { SectionCommunaute } from "@/components/sections/SectionCommunaute";


export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AnbaChain — Plateforme blockchain des professionnels Caraïbéens",
  description: "Réseau, événements et ressources exclusives pour la communauté",
  openGraph: {
    title: "AnbaChain - Réseau de professionnels noirs",
    description: "Plateforme blockchain communautaire",
    type: "website",
    url: "https://wwww.anbachain.org",
  },
}

export default async function HomePage() {
  let evenements: Evenement[] = []
  let evenementFeatured: Evenement | null = null
  let ressources: Ressource[] = []
  let partenaires: Partenaire[] = []
  let hasError = false

  try {
    const [
      { data: ev },
      { data: evFeatured },
      { data: res },
      { data: part }
    ] = await Promise.all([
      sanityFetch({ query: EVENEMENTS_QUERY }),
      sanityFetch({ query: EVENEMENT_FEATURED_QUERY }),
      sanityFetch({ query: RESSOURCES_QUERY }),
      sanityFetch({ query: PARTENAIRES_QUERY }),
    ])

    evenements = ev ?? []
    evenementFeatured = evFeatured ?? null
    ressources = res ?? []
    partenaires = part ?? []
  } catch (error) {
    console.error("Failed to fetch Sanity data:", error)
    hasError = true
  }

  if (hasError) {
    return (
      <ErrorPage 
        message="Impossible de charger les données"
        code={500}
        details="Nous rencontrons une erreur technique. Veuillez réessayer dans quelques instants."
      />
    )
  }

  return (
    <main className="block">
      {/* Section 1 */}
      <SectionHero />

      {/* Section 2 */}
      <SectionMission />

      {/* Section 3 */}
      <SectionStorytelling />

      {/* Section 4 */}
      <ErrorBoundary fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--texte-2)" }}>Erreur lors du chargement des partenaires</div>}>
        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--texte-2)" }}>Chargement partenaires...</div>}>
          <SectionPartenaires partenaires={partenaires} />
        </Suspense>
      </ErrorBoundary>

      {/* Section 5 */}
      <SectionInterstitiel />

      {/* Section 6 */}
      <ErrorBoundary fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--texte-2)" }}>Erreur lors du chargement des événements</div>}>
        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--texte-2)" }}>Chargement événements...</div>}>
          <SectionEvenements 
            evenements={evenements}
            featured={evenementFeatured}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Section 7 */}
      <SectionAdhesion />

      {/* Section 8 */}
      <SectionRessources ressources={ressources} />

      {/* Section 9 */}
      <SectionEspace />

      {/* Section 10 */}
      <SectionEquipe />

      {/* Section 11 */}
      <SectionCommunaute />
      
    </main>
  )
}