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
        'group/cta inline-flex h-[46px] items-center justify-center gap-2 rounded-full px-6 text-base font-medium whitespace-nowrap transition-[background-color,color,transform] duration-300 ease-(--ease-out-expo) active:scale-[0.98] [&_.cta-arrow]:transition-transform [&_.cta-arrow]:duration-[450ms] hover:[&_.cta-arrow]:-rotate-45',
        variant === 'solid'
          ? 'bg-ink text-on-ink hover:bg-ink-hover'
          : 'text-ink hover:bg-ink hover:text-on-ink shadow-[inset_0_0_0_1px_var(--line-2)]',
        className
      )}
    >
      {children}
      {icon}
    </a>
  )
}
