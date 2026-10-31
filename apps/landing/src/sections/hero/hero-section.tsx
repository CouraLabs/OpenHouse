import { ArrowRight, GithubLogo } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { Reveal } from '@/components/reveal.js'
import { useContent } from '@/lib/use-locale.js'

import { HeroPreview } from './hero-preview.js'

export function HeroSection() {
  const { hero } = useContent()
  return (
    <section
      id="top"
      className="relative px-(--pad) pt-14 pb-6 md:pt-20 md:pb-8"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-12">
        <div className="flex max-w-xl flex-col items-start gap-7">
          <Reveal>
            <h1 className="text-ink text-[clamp(2.75rem,5.6vw,4.75rem)] leading-[0.98] font-bold tracking-[-0.035em] text-balance">
              {hero.headline}
            </h1>
          </Reveal>
          <Reveal index={1}>
            <p className="max-w-[46ch] text-[1.125rem] leading-relaxed text-pretty text-muted">
              {hero.tagline}
            </p>
          </Reveal>
          <Reveal index={2} className="flex flex-wrap gap-3">
            <ButtonLink href={hero.primary.href}>
              {hero.primary.label}
              <ArrowRight aria-hidden className="cta-arrow" />
            </ButtonLink>
            <ButtonLink
              href={hero.secondary.href}
              variant="outline"
              newTab
              icon={<GithubLogo aria-hidden size={18} />}
            >
              {hero.secondary.label}
            </ButtonLink>
          </Reveal>
          <Reveal index={3}>
            <p className="text-[0.8125rem] text-muted">{hero.stack}</p>
          </Reveal>
        </div>
        <Reveal index={2} className="min-w-0">
          <HeroPreview />
        </Reveal>
      </div>
    </section>
  )
}
