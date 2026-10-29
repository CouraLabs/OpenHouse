import type { ReactNode } from 'react'
import { cn } from 'cn'

import { IconWell } from '@/components/icon-well.js'
import { Reveal } from '@/components/reveal.js'
import type { Feature } from '@/lib/content.js'

/** The props `FeatureCard` takes. */
interface FeatureCardProps {
  feature: Feature
  /** The card's illustration — a small, true-to-the-app slice. */
  children?: ReactNode
  /** Grid spans; the bento decides each card's footprint. */
  className?: string
  index?: number
}

/**
 * One bento card: the icon well and title on top, the body, then the
 * illustration right under it. Lifts by a hair on hover.
 */
export function FeatureCard({
  feature,
  children,
  className,
  index,
}: FeatureCardProps) {
  return (
    <Reveal index={index} className={cn('col-span-1', className)}>
      <article className="border-line bg-surface hover:bg-bone flex h-full flex-col gap-8 rounded-[20px] border p-7 transition-shadow duration-200 md:p-9">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <IconWell icon={feature.icon} tone={feature.tone} />
            <h3 className="text-ink font-display text-[1.05rem] font-medium tracking-[-0.02em]">
              {feature.title}
            </h3>
          </div>
          <p className="max-w-md text-sm text-pretty text-muted">
            {feature.body}
          </p>
        </div>
        {children}
      </article>
    </Reveal>
  )
}
