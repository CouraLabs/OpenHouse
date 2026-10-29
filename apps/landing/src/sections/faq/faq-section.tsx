import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { SectionHeading } from '@/components/section-heading.js'
import { useContent } from '@/lib/use-locale.js'

import { FaqItem } from './faq-item.js'
import { FaqTabs } from './faq-tabs.js'

/**
 * The head row, then the questions: from `md` up an index left of the
 * `split` column rule with the selected answer right of it; below `md` an
 * accordion ledger, one row per question.
 */
export function FaqSection() {
  const { faq, faqIntro } = useContent()
  return (
    <Section id="faq">
      <SectionHeading {...faqIntro} />
      <Reveal className="-mx-(--pad) -mt-14 -mb-(--pad) md:-mt-20">
        <ol className="md:hidden">
          {faq.map((item, index) => (
            <FaqItem key={item.question} item={item} index={index} />
          ))}
        </ol>
        <div className="hidden md:block">
          <FaqTabs items={faq} />
        </div>
      </Reveal>
    </Section>
  )
}
