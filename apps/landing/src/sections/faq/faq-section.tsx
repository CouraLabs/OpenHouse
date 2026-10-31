import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { FaqItem } from './faq-item.js'
import { FaqTabs } from './faq-tabs.js'

export function FaqSection() {
  const { faq, faqIntro } = useContent()
  return (
    <Section id="faq">
      <SectionHeading {...faqIntro} />
      <Reveal>
        <ul className="surface-card md:hidden">
          {faq.map((item) => (
            <FaqItem key={item.question} item={item} />
          ))}
        </ul>
        <div className="hidden md:block">
          <FaqTabs items={faq} />
        </div>
      </Reveal>
    </Section>
  )
}
