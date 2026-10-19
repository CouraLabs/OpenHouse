import type { ReactNode } from 'react'
import { cn } from 'cn'

import type { Tone } from '@/lib/content.js'
import { toneClasses } from '@/lib/tones.js'

/** A small uppercase status pill on one of the four pastels. */
export function Tag({
  children,
  tone = 'yellow',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.05em] uppercase',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
