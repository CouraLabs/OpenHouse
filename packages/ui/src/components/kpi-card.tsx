import type { ReactNode } from 'react'
import { cn } from 'cn'

import { IconTile } from '@workspace/ui/components/icon-tile'
import type { Tone } from '@workspace/ui/lib/tones'

export function KpiCard({
  icon,
  tone = 'primary',
  label,
  value,
  pill,
  footnote,
  className,
}: {
  icon: ReactNode
  tone?: Tone
  label: string
  value: ReactNode
  pill?: ReactNode
  footnote?: ReactNode
  className?: string
}) {
  return (
    <section
      data-slot="kpi-card"
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-[1.25rem] bg-card p-4 text-card-foreground shadow-soft sm:gap-4 sm:p-5 md:p-6',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <IconTile tone={tone}>{icon}</IconTile>
        <h2 className="truncate text-[0.8125rem] font-medium tracking-normal text-muted-foreground">
          {label}
        </h2>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="truncate figure-kpi max-sm:text-[1.3125rem]">{value}</div>
        {pill !== undefined || footnote !== undefined ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">
            {pill}
            {footnote !== undefined ? (
              <span className="min-w-0 truncate">{footnote}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
