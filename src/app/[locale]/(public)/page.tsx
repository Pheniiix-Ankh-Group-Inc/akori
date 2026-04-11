import { SectionAdhesion } from "@/components/sections/Sectionadhesion";
import { TeamSection } from "@/components/sections/Teamsection";
import { SectionEspace } from "@/components/sections/Sectionespace";
import { EventsSection } from "@/components/sections/Eventssection";
import { HeroSection  } from "@/components/sections/Herosection";
import { SectionInterstitiel } from "@/components/sections/Sectioninterstitiel";
import { MissionSection } from "@/components/sections/Missionsection";
import { PartnersSection } from "@/components/sections/Partnerssection";
import { SectionRessources } from "@/components/sections/Sectionressources";
import { SectionStorytelling } from "@/components/sections/Sectionstorytelling";
import { CommunitySection } from "@/components/sections/Communitysection";
import { Ticker } from "@/components/layout/Ticker";
import { Navbar } from "@/components/layout/Navbar";
import { NewsBand } from "@/components/layout/NewsBand";
import { Divider } from "@/lib/Divider";
import { AdoptionSection } from "@/components/sections/Adoptionsection";
import { PricingSection } from "@/components/sections/Pricingsection";
import { NewsletterSection } from "@/components/sections/Newslettersection";


export const revalidate = 3600;

export default async function HomePage() {

  return (
    <>
    <Ticker />
    <Navbar />
      <main>
      {/* Section 1 */}
      <HeroSection />
      <NewsBand />

      <MissionSection />
      <Divider light />

      <AdoptionSection />
      <Divider />

      <CommunitySection />
      <Divider light />

      <TeamSection />
      <Divider />

      <PricingSection />
      <Divider light />

      <EventsSection />
      <Divider />

      <PartnersSection />
      <Divider light />

      <NewsletterSection />

      {/* Section 2 */}
      {/* <MissionSection /> */}

      {/* Section 3 */}
      {/* <SectionStorytelling /> */}

      {/* Section 4 */}
      {/* <SectionInterstitiel /> */}

      {/* Section 5 */}
       {/* <TeamSection /> */}

      {/* Section 6 */}
      
      {/* <PartnersSection /> */}
      
      {/* Section 7 */}
      {/* <EventsSection /> */}

      {/* Section 8 */}
      {/* <SectionAdhesion /> */}
      
      {/* Section 9 */}
      {/* <SectionRessources  /> */}
      
      {/* Section 10 */}
      {/* <SectionEspace /> */}
     
      {/* Section 11 */}
      {/* <CommunitySection /> */}

    </main>
    </>
  )
}