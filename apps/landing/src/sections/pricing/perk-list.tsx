import { Check, Minus } from '@phosphor-icons/react'
import { cn } from 'cn'

import type { Perk } from '@/lib/content.js'

/** A plan's perks; one left out is struck through behind a dash. */
export function PerkList({ perks }: { perks: Perk[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {perks.map((perk) => {
        const included = perk.included !== false
        return (
          <li
            key={perk.label}
            className={cn(
              'flex items-start gap-2.5 text-sm',
              included ? 'text-body' : 'text-muted line-through'
            )}
          >
            {included ? (
              <Check aria-hidden className="text-ink mt-1 shrink-0" size={14} />
            ) : (
              <Minus
                aria-hidden
                className="mt-1 shrink-0 text-muted"
                size={14}
              />
            )}
            {perk.label}
          </li>
        )
      })}
    </ul>
  )
}
