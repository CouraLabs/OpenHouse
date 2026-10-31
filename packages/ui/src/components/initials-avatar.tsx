import { cn } from 'cn'

import { pastelFor } from '@workspace/ui/lib/tones'

export function InitialsAvatar({
  name,
  kind = 'person',
  size = 'default',
  className,
}: {
  name: string
  kind?: 'person' | 'organization'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-size={size}
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold text-pastel-foreground select-none data-[size=default]:size-10 data-[size=default]:text-[0.8125rem] data-[size=lg]:size-12 data-[size=lg]:text-sm data-[size=sm]:size-8 data-[size=sm]:text-xs',
        kind === 'person' ? 'rounded-full' : 'rounded-[0.75rem]',
        pastelFor(name),
        className
      )}
    >
      {initials(name)}
    </span>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)

  if (parts.length === 0) {
    return '·'
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}
