import type { ReactNode } from 'react'
import { cn } from 'cn'

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
  const Glyph = feature.icon

  return (
    <Reveal index={index} className={cn('col-span-1', className)}>
      <article className="border-line hover:bg-surface flex h-full flex-col gap-8 border-r border-b p-7 transition-colors duration-200 ease-(--ease-out-expo) md:p-9">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Glyph
              aria-hidden
              weight="light"
              className="text-ink size-5 shrink-0"
            />
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
