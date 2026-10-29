import type { ReactNode } from 'react'
import { cn } from 'cn'

import type { Tone } from '@/lib/content.js'

/**
 * A mono hairline pill. `tone` still names the room a tag belongs to, but
 * the sheet is ink-only, so every tone draws the same.
 */
export function Tag({
  children,
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'ring-line-2 text-body inline-flex items-center gap-1.5 rounded-full px-3 py-[3px] font-mono text-[0.78rem] ring-1 ring-inset',
        className
      )}
    >
      {children}
    </span>
  )
}
