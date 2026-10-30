import type { ReactNode } from 'react'
import { cn } from 'cn'

import { Tick } from './tick.js'

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
      className={cn('cell relative scroll-mt-16 p-(--pad)', className)}
    >
      <Tick x="0" y="0" />
      <Tick x="100%" y="0" />
      <div className="flex flex-col gap-14 md:gap-20">{children}</div>
    </section>
  )
}
