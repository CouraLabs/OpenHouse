import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { FaqItem } from './faq-item.js'

/** The heading beside a boxless accordion on wide screens, stacked below `md`. */
export function FaqSection() {
  const { faq, faqIntro } = useContent()
  return (
    <Section id="faq">
      <div className="grid gap-12 md:grid-cols-[1fr_1.6fr]">
        <SectionHeading {...faqIntro} />
        <Reveal>
          <ul className="border-line border-t">
            {faq.map((item) => (
              <FaqItem key={item.question} item={item} />
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  )
}
