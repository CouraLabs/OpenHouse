import type { ReactNode } from 'react'
import { cn } from 'cn'

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
        'relative scroll-mt-20 px-(--pad) py-20 md:py-28',
        className
      )}
    >
      <div className="flex flex-col gap-12 md:gap-16">{children}</div>
    </section>
  )
}
