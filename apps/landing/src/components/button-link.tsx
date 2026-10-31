import type { ReactNode } from 'react'
import { cn } from 'cn'

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
  icon?: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noreferrer' : undefined}
      className={cn(
        'group/cta inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 ease-(--ease-out-expo) active:scale-[0.98] [&_.cta-arrow]:transition-transform [&_.cta-arrow]:duration-200 hover:[&_.cta-arrow]:translate-x-0.5',
        variant === 'solid'
          ? 'bg-action text-on-action hover:bg-action-hover shadow-(--shadow-glow)'
          : 'text-ink bg-surface border-line-2 border shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:bg-surface-2 dark:shadow-none',
        className
      )}
    >
      {icon}
      {children}
    </a>
  )
}
