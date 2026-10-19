import { ButtonLink } from '@/components/button-link.js'
import { Tag } from '@/components/tag.js'
import type { Plan } from '@/lib/content.js'

import { PerkList } from './perk-list.js'
import { PlanPrice } from './plan-price.js'

/**
 * One hosted plan. The featured plan earns a tag and the solid button; the
 * rest take the outline, so the page keeps a single dark accent per row.
 */
export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="border-line bg-surface flex h-full flex-col gap-8 rounded-xl border p-7 transition-shadow duration-200 hover:shadow-lift md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-ink text-base font-medium">{plan.name}</h3>
          {plan.featured && <Tag tone="blue">Most complete</Tag>}
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
