import type { ReactNode } from 'react'
import { cn } from 'cn'

import { toneTile, type Tone } from '@workspace/ui/lib/tones'

export function StatusPill({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      data-slot="status-pill"
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        toneTile[tone],
        className
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  )
}
