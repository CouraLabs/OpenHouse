import { ArrowRight } from '@phosphor-icons/react'

import { Tag } from '@/components/tag.js'

/**
 * A transaction preset at work: the typed description, then the category
 * and receiver it fills in.
 */
export function LinkerVisual() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="border-line bg-bone flex flex-col rounded-md border px-3 py-2">
        <span className="font-mono text-[10px] tracking-[0.05em] text-muted uppercase">
          Description
        </span>
        <span className="text-ink text-sm">Monthly rent</span>
      </div>
      <ArrowRight
        aria-hidden
        className="rotate-90 self-center text-muted sm:rotate-0"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="red">Housing</Tag>
        <span className="text-ink text-sm">
          Oak Street Rentals
          <span className="ml-1.5 text-xs text-muted">Service</span>
        </span>
      </div>
    </div>
  )
}
