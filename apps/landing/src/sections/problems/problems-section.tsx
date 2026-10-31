import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { ProblemCard } from './problem-card.js'

export function ProblemsSection() {
  const { problems, problemsIntro } = useContent()
  return (
    <Section id="why">
      <SectionHeading {...problemsIntro} />
      <Reveal>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {problems.map((problem) => (
            <ProblemCard key={problem.pain} problem={problem} />
          ))}
        </ul>
      </Reveal>
    </Section>
  )
}
