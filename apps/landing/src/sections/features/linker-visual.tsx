import { ArrowRight } from '@phosphor-icons/react'

import { Tag } from '@/components/tag.js'
import { useContent } from '@/lib/use-locale.js'

export function LinkerVisual() {
  const { sampleLinker } = useContent()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="border-line flex flex-col gap-0.5 rounded-[0.875rem] border bg-surface-2 px-4 py-2.5">
        <span className="label-caps">{sampleLinker.descriptionLabel}</span>
        <span className="text-ink text-sm">{sampleLinker.description}</span>
      </div>
      <ArrowRight
        aria-hidden
        className="rotate-90 self-center text-muted sm:rotate-0"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="red">{sampleLinker.category}</Tag>
        <span className="text-ink text-sm">
          {sampleLinker.receiver}
          <span className="ml-1.5 text-xs text-muted">
            {sampleLinker.receiverKind}
          </span>
        </span>
      </div>
    </div>
  )
}
