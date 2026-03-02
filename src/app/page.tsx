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
export default function HomePage() {
  return (
    <main className="block">
     
      {/* Section 1 */}
      <SectionHero />

      {/* Section 2 */}
      <SectionMission />

      {/* Section 3 */}
      <SectionStorytelling />

      {/* Section 4 */}
      <SectionPartenaires />

      {/* Section 5 */}
      <SectionInterstitiel />

      {/* Section 6 */}
      <SectionEvenements />

      {/* Section 7 */}
      <SectionAdhesion />

      {/* Section 8 */}
      <SectionRessources />

      {/* Section 9 */}
      <SectionEspace />

      {/* Section 10 */}
      <SectionEquipe />

      {/* Section 11 */}
      <SectionCommunaute />
    </main>
  )
}