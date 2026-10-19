import type { ReactNode } from 'react'
import { cn } from 'cn'

/**
 * A call to action as a link: `solid` is the charcoal primary, `outline` the
 * hairline secondary. Both press in to 98% on `:active`.
 */
export function ButtonLink({
  href,
  children,
  variant = 'solid',
  newTab,
  icon,
  className,
}: {
  href: string
  children: ReactNode
  variant?: 'solid' | 'outline'
  newTab?: boolean
  /** Rendered after the label. */
  icon?: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noreferrer' : undefined}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-[background-color,transform] duration-200 active:scale-[0.98]',
        variant === 'solid'
          ? 'bg-ink text-on-ink hover:bg-ink-hover'
          : 'border-line bg-surface text-ink hover:bg-bone border',
        className
      )}
    >
      {children}
      {icon}
    </a>
  )
}
