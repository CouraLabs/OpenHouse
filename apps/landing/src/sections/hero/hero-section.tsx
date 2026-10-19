import { ArrowRight, GithubLogo } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { Reveal } from '@/components/reveal.js'
import { Tag } from '@/components/tag.js'
import { hero } from '@/lib/content.js'

import { HeroPreview } from './hero-preview.js'

/**
 * The opening: a centered serif headline, tagline, and both calls to action
 * over a faded hairline grid, then the app window below.
 */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative isolate px-6 pt-24 pb-24 md:pt-36 md:pb-32"
    >
      <div aria-hidden className="line-grid absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-16 md:gap-24">
        <div className="flex max-w-3xl flex-col items-center gap-7 text-center">
          <Reveal>
            <Tag tone="green">{hero.eyebrow}</Tag>
          </Reveal>
          <Reveal index={1}>
            <h1 className="text-ink font-serif text-5xl leading-[1.05] tracking-[-0.035em] text-balance md:text-7xl">
              {hero.headline}
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="max-w-xl text-base text-pretty text-muted md:text-lg">
              {hero.tagline}
            </p>
          </Reveal>
          <Reveal index={3} className="flex flex-wrap justify-center gap-3">
            <ButtonLink
              href={hero.primary.href}
              icon={<ArrowRight aria-hidden />}
            >
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink
              href={hero.secondary.href}
              variant="outline"
              newTab
              icon={<GithubLogo aria-hidden />}
            >
              {hero.secondary.label}
            </ButtonLink>
          </Reveal>
          <Reveal index={4}>
            <p className="font-mono text-xs text-muted">{hero.stack}</p>
          </Reveal>
        </div>
        <Reveal index={5} className="w-full">
          <HeroPreview />
        </Reveal>
      </div>
    </section>
  )
}
