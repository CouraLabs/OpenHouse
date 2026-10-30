import { AmbientLight } from '@/components/ambient-light.js'
import { FaqSection } from '@/sections/faq/faq-section.js'
import { FeaturesSection } from '@/sections/features/features-section.js'
import { SiteFooter } from '@/sections/footer/site-footer.js'
import { HeroSection } from '@/sections/hero/hero-section.js'
import { HouseIndexSection } from '@/sections/house/house-index-section.js'
import { SiteNav } from '@/sections/nav/site-nav.js'
import { OpenSourceSection } from '@/sections/open-source/open-source-section.js'
import { PlannersSection } from '@/sections/planners/planners-section.js'
import { PricingSection } from '@/sections/pricing/pricing-section.js'

export function App() {
  return (
    <>
      <AmbientLight />
      <SiteNav />
      <div className="sheet">
        <main>
          <HeroSection />
          <HouseIndexSection />
          <FeaturesSection />
          <PlannersSection />
          <PricingSection />
          <FaqSection />
          <OpenSourceSection />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}
