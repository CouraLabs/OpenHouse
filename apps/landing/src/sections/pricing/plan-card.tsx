import { ButtonLink } from '@/components/button-link.js'
import { Tag } from '@/components/tag.js'
import type { Plan } from '@/lib/content.js'
import { useContent } from '@/lib/use-locale.js'

import { PerkList } from './perk-list.js'
import { PlanPrice } from './plan-price.js'

export function PlanCard({ plan }: { plan: Plan }) {
  const { featuredBadge, earlyAccessBadge } = useContent()

  return (
    <article className="border-line bg-surface hover:bg-bone flex h-full flex-col gap-8 rounded-[20px] border p-7 transition-shadow duration-200 md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-ink font-display text-[1.05rem] font-medium tracking-[-0.02em]">
            {plan.name}
          </h3>
          {plan.featured && <Tag tone="green">{featuredBadge}</Tag>}
          {plan.earlyAccess && (
            <Tag className="ring-line text-muted">{earlyAccessBadge}</Tag>
          )}
        </div>
        <p className="text-sm text-pretty text-muted">{plan.tagline}</p>
      </div>
      <PlanPrice price={plan.price} note={plan.priceNote} />
      <PerkList perks={plan.perks} />
      <ButtonLink
        href={plan.cta.href}
        variant={plan.featured ? 'solid' : 'outline'}
        className="mt-auto w-full"
      >
        {plan.cta.label}
      </ButtonLink>
    </article>
  )
}
