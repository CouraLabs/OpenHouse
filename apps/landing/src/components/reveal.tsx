import type { CSSProperties, ReactNode } from 'react'
import { cn } from 'cn'

import { useInView } from '@/lib/use-in-view.js'

export function Reveal({
  children,
  index = 0,
  as: Element = 'div',
  className,
}: {
  children: ReactNode
  index?: number
  as?: 'div' | 'li'
  className?: string
}) {
  const [ref, inView] = useInView<HTMLDivElement & HTMLLIElement>()

  return (
    <Element
      ref={ref}
      data-in-view={inView}
      style={{ '--index': index } as CSSProperties}
      className={cn('reveal', className)}
    >
      {children}
    </Element>
  )
}
