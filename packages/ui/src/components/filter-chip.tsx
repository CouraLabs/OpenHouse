import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'cn'

export function FilterChip({
  active = false,
  count,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  active?: boolean
  count?: ReactNode
}) {
  return (
    <button
      type="button"
      data-slot="filter-chip"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[0.8125rem] font-medium text-foreground transition-colors hover:bg-surface-2 aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-background dark:border-input',
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span className="rounded-full bg-surface-2 px-1.5 text-[0.6875rem] leading-5 text-muted-foreground tabular-nums in-aria-pressed:bg-background/15 in-aria-pressed:text-background">
          {count}
        </span>
      ) : null}
    </button>
  )
}
