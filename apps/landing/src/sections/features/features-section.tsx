import { LimitBar } from '@/components/preview/limit-bar.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { AccountsVisual } from './accounts-visual.js'
import { FeatureCard } from './feature-card.js'
import { GoalVisual } from './goal-visual.js'
import { HouseholdVisual } from './household-visual.js'
import { LinkerVisual } from './linker-visual.js'
import { ScheduleVisual } from './schedule-visual.js'
import { TransactionsVisual } from './transactions-visual.js'

export function FeaturesSection() {
  const { features, featuresIntro, sampleLimits } = useContent()
  return (
    <Section id="features">
      <SectionHeading {...featuresIntro} />
      <div className="border-line -mx-(--pad) -mt-14 -mb-(--pad) grid grid-cols-1 md:-mt-20 md:grid-cols-6 md:[&>*:nth-child(2)>article]:border-r-0 md:[&>*:nth-child(3)>article]:border-r-0 md:[&>*:nth-child(5)>article]:border-r-0 md:[&>*:nth-child(7)>article]:border-r-0 [&>*:nth-last-child(-n+1)>article]:border-b-0 md:[&>*:nth-last-child(-n+2)>article]:border-b-0 max-md:[&>*>article]:border-r-0">
        <FeatureCard
          feature={features.transactions}
          className="md:col-span-3 md:row-span-2"
        >
          <TransactionsVisual />
        </FeatureCard>
        <FeatureCard
          feature={features.accounts}
          className="md:col-span-3"
          index={1}
        >
          <AccountsVisual />
        </FeatureCard>
        <FeatureCard
          feature={features.recurring}
          className="md:col-span-3"
          index={2}
        >
          <ScheduleVisual />
        </FeatureCard>
        <FeatureCard feature={features.limits} className="md:col-span-2">
          <div className="flex flex-col gap-4">
            {sampleLimits.slice(0, 2).map((limit) => (
              <LimitBar key={limit.label} {...limit} />
            ))}
          </div>
        </FeatureCard>
        <FeatureCard
          feature={features.goals}
          className="md:col-span-4"
          index={1}
        >
          <GoalVisual />
        </FeatureCard>
        <FeatureCard feature={features.linkers} className="md:col-span-4">
          <LinkerVisual />
        </FeatureCard>
        <FeatureCard
          feature={features.household}
          className="md:col-span-2"
          index={1}
        >
          <HouseholdVisual />
        </FeatureCard>
      </div>
    </Section>
  )
}
