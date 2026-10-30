import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { PlannerRow } from './planner-row.js'

export function PlannersSection() {
  const { planners, plannersIntro } = useContent()
  return (
    <Section id="planners">
      <SectionHeading {...plannersIntro} />
      <ul className="border-line border-t">
        {planners.map((planner, index) => (
          <PlannerRow key={planner.title} planner={planner} index={index} />
        ))}
      </ul>
    </Section>
  )
}
