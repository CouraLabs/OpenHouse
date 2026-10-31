import { GithubLogo } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { useContent } from '@/lib/use-locale.js'

export function OpenSourceSection() {
  const { openSource } = useContent()
  return (
    <Section id="open-source">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Reveal index={1}>
          <h2 className="text-ink text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.04] font-bold tracking-[-0.035em] text-balance">
            {openSource.title}
          </h2>
        </Reveal>
        <Reveal index={2}>
          <p className="max-w-xl text-base text-pretty text-muted md:text-lg">
            {openSource.body}
          </p>
        </Reveal>
        <Reveal index={3}>
          <ButtonLink
            href={openSource.cta.href}
            newTab
            icon={<GithubLogo aria-hidden />}
          >
            {openSource.cta.label}
          </ButtonLink>
        </Reveal>
      </div>
      <ul className="grid overflow-hidden surface-card md:grid-cols-3">
        {openSource.points.map((point, index) => {
          const Glyph = point.icon
          return (
            <Reveal
              as="li"
              key={point.label}
              index={index}
              className="border-line text-ink flex items-center gap-3 p-6 text-sm last:border-0 max-md:border-b md:border-r"
            >
              <Glyph aria-hidden size={18} className="text-action shrink-0" />
              {point.label}
            </Reveal>
          )
        })}
      </ul>
    </Section>
  )
}
