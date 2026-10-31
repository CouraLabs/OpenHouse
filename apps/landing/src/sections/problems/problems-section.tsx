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
      <Reveal className="-mx-(--pad) -mt-14 -mb-(--pad) md:-mt-20">
        <ol>
          {problems.map((problem, index) => (
            <ProblemCard key={problem.pain} problem={problem} index={index} />
          ))}
        </ol>
      </Reveal>
    </Section>
  )
}
