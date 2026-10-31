import type { Icon } from '@phosphor-icons/react'
import { cn } from 'cn'

import type { Tone } from '@/lib/content.js'

const tones: Record<Tone, string> = {
  red: 'bg-[color-mix(in_oklab,var(--data-orange)_22%,transparent)] text-[color-mix(in_oklab,var(--data-orange)_58%,var(--ink))]',
  blue: 'bg-[color-mix(in_oklab,var(--data-blue)_20%,transparent)] text-[color-mix(in_oklab,var(--data-blue)_62%,var(--ink))]',
  green:
    'bg-[color-mix(in_oklab,var(--data-in)_20%,transparent)] text-[color-mix(in_oklab,var(--data-in)_62%,var(--ink))]',
  yellow:
    'bg-[color-mix(in_oklab,var(--data-olive)_20%,transparent)] text-[color-mix(in_oklab,var(--data-olive)_62%,var(--ink))]',
  bone: 'bg-surface-2 text-muted',
}

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
        'inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem]',
        tones[tone],
        className
      )}
    >
      <Glyph aria-hidden size={18} />
    </span>
  )
}
