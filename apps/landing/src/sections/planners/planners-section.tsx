import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { planners, plannersIntro } from '@/lib/content.js'

import { PlannerRow } from './planner-row.js'

/** The calculators and guides as a ruled list, read like a table of contents. */
export function PlannersSection() {
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
