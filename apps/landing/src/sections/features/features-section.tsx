import { LimitBar } from '@/components/preview/limit-bar.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { features, featuresIntro } from '@/lib/content.js'

import { AccountsVisual } from './accounts-visual.js'
import { FeatureCard } from './feature-card.js'
import { GoalVisual } from './goal-visual.js'
import { HouseholdVisual } from './household-visual.js'
import { LinkerVisual } from './linker-visual.js'
import { ScheduleVisual } from './schedule-visual.js'
import { TransactionsVisual } from './transactions-visual.js'

/**
 * The asymmetrical bento of ledger features: transactions as the tall
 * anchor beside accounts and recurring rules, then rows that alternate
 * 2/4 and 4/2 of six columns. One column below `md`.
 */
export function FeaturesSection() {
  return (
    <Section id="features">
      <SectionHeading {...featuresIntro} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
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
            <LimitBar label="Groceries" spent="$486" cap="$600" percent={81} />
            <LimitBar label="Transport" spent="$94" cap="$250" percent={38} />
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
