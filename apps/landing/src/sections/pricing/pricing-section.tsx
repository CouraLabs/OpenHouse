import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { PlanCard } from './plan-card.js'
import { SelfHostPlan } from './self-host-plan.js'

export function PricingSection() {
  const { hostedPlans, pricingIntro } = useContent()
  return (
    <Section id="pricing">
      <SectionHeading {...pricingIntro} />
      <div className="flex flex-col gap-4">
        <SelfHostPlan />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
