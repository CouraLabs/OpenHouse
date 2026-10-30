import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { ProblemCard } from './problem-card.js'

export function ProblemsSection() {
  const { problems, problemsIntro } = useContent()
  return (
    <Section id="why">
      <SectionHeading {...problemsIntro} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {problems.map((problem, index) => (
          <ProblemCard key={problem.pain} problem={problem} index={index} />
        ))}
      </div>
    </Section>
  )
}
