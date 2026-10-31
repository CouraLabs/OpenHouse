import type { ReactNode } from 'react'
import { cn } from 'cn'

import { toneTile, type Tone } from '@workspace/ui/lib/tones'

export function IconTile({
  tone = 'primary',
  size = 'default',
  className,
  children,
}: {
  tone?: Tone
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      aria-hidden
      data-size={size}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[0.625rem] data-[size=default]:size-8 data-[size=lg]:size-10 data-[size=sm]:size-7 [&_svg:not([class*='size-'])]:size-4",
        toneTile[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
