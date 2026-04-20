import { TeamSection } from "@/components/sections/Teamsection";
import { EventsSection } from "@/components/sections/Eventssection";
import { HeroSection  } from "@/components/sections/Herosection";
import { MissionSection } from "@/components/sections/Missionsection";
import { PartnersSection } from "@/components/sections/Partnerssection";
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

    </main>
    </>
  )
}