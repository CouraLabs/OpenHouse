import type { Icon } from '@phosphor-icons/react'
import { cn } from 'cn'

import type { Tone } from '@/lib/content.js'

export function IconWell({
  icon: Glyph,
  className,
}: {
  icon: Icon
  tone: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'ring-line-2 text-ink inline-flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
        className
      )}
    >
      <Glyph aria-hidden />
    </span>
  )
}
