import type { Icon } from '@phosphor-icons/react'
import { cn } from 'cn'

import type { Tone } from '@/lib/content.js'
import { toneClasses } from '@/lib/tones.js'

/** An icon seated in a small square of pastel wash. */
export function IconWell({
  icon: Glyph,
  tone,
  className,
}: {
  icon: Icon
  tone: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md',
        toneClasses[tone],
        className
      )}
    >
      <Glyph aria-hidden />
    </span>
  )
}
