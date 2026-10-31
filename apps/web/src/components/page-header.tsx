import type { ReactNode } from 'react'

import { PageTrail } from '@/components/layout/page-trail.js'

interface PageHeaderProps {
  title: string
  subtitle?: string
  context?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  context,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {context ?? <PageTrail />}
        <h1 className="text-[clamp(1.875rem,3.4vw,2.5rem)] leading-[1.08] font-bold tracking-[-0.025em]">
          {title}
        </h1>
        {subtitle !== undefined ? (
          <p className="max-w-prose text-[0.9375rem] text-pretty text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
