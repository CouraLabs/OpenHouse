import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight md:text-4xl">
          {title}
        </h1>
        {subtitle !== undefined ? (
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
