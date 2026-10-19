import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { hostedPlans, pricingIntro } from '@/lib/content.js'

import { PlanCard } from './plan-card.js'
import { SelfHostPlan } from './self-host-plan.js'

/** The self-hosted plan as a wide card, then the three hosted plans in a row. */
export function PricingSection() {
  return (
    <Section id="pricing" className="bg-bone/50">
      <SectionHeading {...pricingIntro} />
      <div className="flex flex-col gap-4">
        <SelfHostPlan />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {hostedPlans.map((plan, index) => (
            <Reveal key={plan.name} index={index}>
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
