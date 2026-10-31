import type { ReactNode } from 'react'
import { cn } from 'cn'

import type { Tone } from '@/lib/content.js'

const tones: Record<Tone, string> = {
  red: 'bg-attention-soft text-attention-foreground',
  blue: 'bg-info-soft text-info',
  green: 'bg-action-soft text-action',
  yellow: 'bg-attention-soft text-attention-foreground',
  bone: 'bg-surface-2 text-muted',
}

export function Tag({
  children,
  tone = 'bone',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
