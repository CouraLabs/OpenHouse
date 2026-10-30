import { ArrowRight, GithubLogo } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { HouseGlyph } from '@/components/house-glyph.js'
import { Reveal } from '@/components/reveal.js'
import { useContent } from '@/lib/use-locale.js'

import { HeroPreview } from './hero-preview.js'

export function HeroSection() {
  const { hero } = useContent()
  return (
    <section
      id="top"
      className="relative isolate px-(--pad) pt-24 pb-24 md:pt-36 md:pb-32"
    >
      <div aria-hidden className="line-grid absolute inset-0 -z-10" />
      <div className="flex flex-col items-center gap-16 md:gap-24">
        <div className="grid w-full items-center gap-12 md:grid-cols-[1fr_auto]">
          <div className="flex max-w-3xl flex-col items-start gap-7">
            <Reveal>
              <h1 className="text-ink font-display text-[clamp(2.2rem,5.7vw,5.1rem)] leading-[1.02] font-medium tracking-[-0.045em] text-balance">
                {hero.headline}
              </h1>
            </Reveal>
            <Reveal index={1}>
              <p className="text-body max-w-[52ch] text-[1.1rem] text-pretty">
                {hero.tagline}
              </p>
            </Reveal>
            <Reveal index={2} className="flex flex-wrap gap-3">
              <ButtonLink
                href={hero.primary.href}
                icon={<ArrowRight aria-hidden className="cta-arrow" />}
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
            <Reveal index={3}>
              <p className="font-mono text-xs text-muted">{hero.stack}</p>
            </Reveal>
          </div>
          <div
            aria-hidden
            className="relative hidden size-64 items-center justify-center md:flex lg:size-80"
          >
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              className="text-line-2 absolute inset-0"
            >
              <circle
                cx="50"
                cy="50"
                r="49"
                fill="none"
                stroke="currentColor"
                strokeWidth={0.4}
                pathLength={1}
                className="plot-stroke [animation-duration:2400ms]"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--muted)"
                strokeWidth={0.6}
                strokeDasharray="0.6 2.4"
                strokeLinecap="round"
              />
            </svg>
            <HouseGlyph
              plot
              weight={1.3}
              className="text-ink size-32 lg:size-40"
            />
          </div>
        </div>
        <Reveal index={4} className="w-full">
          <HeroPreview />
        </Reveal>
      </div>
    </section>
  )
}
