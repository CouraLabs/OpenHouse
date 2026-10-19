import { GithubLogo } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { Eyebrow } from '@/components/eyebrow.js'
import { Reveal } from '@/components/reveal.js'
import { Section } from '@/components/section.js'
import { openSource } from '@/lib/content.js'

/**
 * The closing argument, centered over the hairline grid: serif title, body,
 * the three facts as a ruled row, and the call to star the repository.
 */
export function OpenSourceSection() {
  return (
    <Section id="open-source" className="isolate">
      <div aria-hidden className="line-grid absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Reveal>
          <Eyebrow>{openSource.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal index={1}>
          <h2 className="text-ink font-serif text-5xl leading-[1.05] tracking-[-0.035em] text-balance md:text-6xl">
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
      <ul className="border-line bg-surface grid overflow-hidden rounded-xl border md:grid-cols-3">
        {openSource.points.map((point, index) => {
          const Glyph = point.icon
          return (
            <Reveal
              as="li"
              key={point.label}
              index={index}
              className="border-line text-ink flex items-center gap-3 p-6 text-sm last:border-0 max-md:border-b md:border-r"
            >
              <Glyph aria-hidden className="shrink-0 text-muted" />
              {point.label}
            </Reveal>
          )
        })}
      </ul>
    </Section>
  )
}
