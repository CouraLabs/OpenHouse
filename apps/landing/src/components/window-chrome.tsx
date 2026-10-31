import type { ReactNode } from 'react'
import { cn } from 'cn'

export function WindowChrome({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-surface overflow-hidden rounded-[1.25rem] shadow-(--shadow-soft)',
        className
      )}
    >
      {title && (
        <div className="border-line flex h-11 items-center border-b px-5">
          <span className="text-ink text-[0.8125rem] font-semibold">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
