import type { ReactNode } from 'react'
import { cn } from 'cn'

/**
 * A page section: the shared macro-whitespace and the 5xl content column,
 * with a hairline rule above it so sections read as pages of one document.
 */
export function Section({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'border-line relative border-t scroll-mt-16 px-6 py-24 md:py-32',
        className
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-14 md:gap-20">
        {children}
      </div>
    </section>
  )
}
