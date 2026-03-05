import { sanityFetch } from "@/sanity/lib/live";
import {
  EVENEMENTS_QUERY,
  EVENEMENT_FEATURED_QUERY,
  RESSOURCES_QUERY,
  PARTENAIRES_QUERY,
  EQUIPE_QUERY,
} from "@/lib/queries"

import type { Evenement, Ressource, Partenaire, MembreEquipe } from "@/types"

import { SectionAdhesion } from "@/components/sections/Sectionadhesion";
import { SectionCommunaute } from "@/components/sections/Sectioncommunaute";
import { SectionEquipe } from "@/components/sections/Sectionequipe";
import { SectionEspace } from "@/components/sections/Sectionespace";
import { SectionEvenements } from "@/components/sections/Sectionevenements";
import { SectionHero } from "@/components/sections/Sectionhero";
import { SectionInterstitiel } from "@/components/sections/Sectioninterstitiel";
import { SectionMission } from "@/components/sections/Sectionmission";
import { SectionPartenaires } from "@/components/sections/Sectionpartenaires";
import { SectionRessources } from "@/components/sections/Sectionressources";
import { SectionStorytelling } from "@/components/sections/Sectionstorytelling";

// src/app/page.tsx
export default async function HomePage() {

const [
  { data: evenements },
  { data: evenementFeatured },
  { data: ressources },
  { data: partenaires },
  { data: equipe },
] = await Promise.all([
  sanityFetch({ query: EVENEMENTS_QUERY }),
  sanityFetch({ query: EVENEMENT_FEATURED_QUERY }),
  sanityFetch({ query: RESSOURCES_QUERY }),
  sanityFetch({ query: PARTENAIRES_QUERY }),
  sanityFetch({ query: EQUIPE_QUERY }),
])

  return (
    <main className="block">
     
      {/* Section 1 */}
      <SectionHero />

      {/* Section 2 */}
      <SectionMission />

      {/* Section 3 */}
      <SectionStorytelling />

      {/* Section 4 */}
      <SectionPartenaires partenaires={partenaires as Partenaire[]} />

      {/* Section 5 */}
      <SectionInterstitiel />

      {/* Section 6 */}
      <SectionEvenements 
        evenements={(evenements as Evenement[]) ?? []}
        featured={(evenementFeatured as Evenement) ?? null}
      />

      {/* Section 7 */}
      <SectionAdhesion />

      {/* Section 8 */}
      <SectionRessources ressources={ressources as Ressource[]} />

      {/* Section 9 */}
      <SectionEspace />

      {/* Section 10 */}
      <SectionEquipe equipe={equipe as MembreEquipe[]} />

      {/* Section 11 */}
      <SectionCommunaute />
    </main>
  )
}