import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { PlanCard } from './plan-card.js'
import { SelfHostPlan } from './self-host-plan.js'

export function PricingSection() {
  const { hostedPlans, pricingIntro } = useContent()
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
