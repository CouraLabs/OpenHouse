import { GithubLogo } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { Reveal } from '@/components/reveal.js'
import { Tag } from '@/components/tag.js'
import { useContent } from '@/lib/use-locale.js'

import { PerkList } from './perk-list.js'
import { PlanPrice } from './plan-price.js'
import { TerminalSnippet } from './terminal-snippet.js'

export function SelfHostPlan() {
  const { selfHosted } = useContent()
  return (
    <Reveal>
      <article className="border-line bg-surface grid gap-10 rounded-[20px] border p-7 md:grid-cols-2 md:p-10">
        <div className="flex min-w-0 flex-col gap-7">
          <div className="flex flex-col gap-3">
            <Tag tone="green" className="self-start">
              {selfHosted.badge}
            </Tag>
            <h3 className="text-ink font-display text-3xl leading-[1.1] font-medium tracking-[-0.045em]">
              {selfHosted.name}
            </h3>
            <p className="text-sm text-pretty text-muted">
              {selfHosted.tagline}
            </p>
          </div>
          <PlanPrice price={selfHosted.price} note={selfHosted.priceNote} />
          <PerkList perks={selfHosted.perks} />
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <TerminalSnippet commands={selfHosted.commands} />
          <ButtonLink
            href={selfHosted.cta.href}
            newTab
            icon={<GithubLogo aria-hidden />}
            className="self-start"
          >
            {selfHosted.cta.label}
          </ButtonLink>
        </div>
      </article>
    </Reveal>
  )
}
