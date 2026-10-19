import type { CSSProperties, ReactNode } from 'react'
import { cn } from 'cn'

import { useInView } from '@/lib/use-in-view.js'

/**
 * Rises 12px into place the first time it scrolls into view (`.reveal` in
 * landing.css, gated on reduced motion). `index` staggers siblings 80ms apart.
 */
export function Reveal({
  children,
  index = 0,
  as: Element = 'div',
  className,
}: {
  children: ReactNode
  index?: number
  /** `li` when the reveal is itself a list item. */
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
