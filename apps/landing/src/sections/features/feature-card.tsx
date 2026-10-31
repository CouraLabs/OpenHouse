import type { ReactNode } from 'react'
import { cn } from 'cn'

import { IconWell } from '@/components/icon-well.js'
import { Reveal } from '@/components/reveal.js'
import type { Feature } from '@/lib/content.js'

interface FeatureCardProps {
  feature: Feature
  children?: ReactNode
  className?: string
  index?: number
}

export function FeatureCard({
  feature,
  children,
  className,
  index,
}: FeatureCardProps) {
  return (
    <Reveal index={index} className={cn('col-span-1', className)}>
      <article className="flex h-full flex-col gap-7 surface-card p-6 transition-transform duration-150 hover:-translate-y-px md:p-7">
        <div className="flex flex-col gap-3">
          <IconWell icon={feature.icon} tone={feature.tone} />
          <div className="flex flex-col gap-1">
            <h3 className="text-ink text-[1.125rem] font-semibold tracking-[-0.015em]">
              {feature.title}
            </h3>
            <p className="max-w-md text-[0.875rem] text-pretty text-muted">
              {feature.body}
            </p>
          </div>
        </div>
        <div className="mt-auto">{children}</div>
      </article>
    </Reveal>
  )
}
