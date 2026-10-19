import { AmbientLight } from '@/components/ambient-light.js'
import { FaqSection } from '@/sections/faq/faq-section.js'
import { FeaturesSection } from '@/sections/features/features-section.js'
import { SiteFooter } from '@/sections/footer/site-footer.js'
import { HeroSection } from '@/sections/hero/hero-section.js'
import { SiteNav } from '@/sections/nav/site-nav.js'
import { OpenSourceSection } from '@/sections/open-source/open-source-section.js'
import { PlannersSection } from '@/sections/planners/planners-section.js'
import { PricingSection } from '@/sections/pricing/pricing-section.js'

/**
 * The landing page: one slow warm light and a fixed grain under
 * the sticky nav, then the sections in reading order.
 */
export function App() {
  return (
    <>
      <AmbientLight />
      <div className="grain" aria-hidden />
      <SiteNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PlannersSection />
        <PricingSection />
        <FaqSection />
        <OpenSourceSection />
      </main>
      <SiteFooter />
    </>
  )
}
