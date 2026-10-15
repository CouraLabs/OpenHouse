import type { ReactNode } from 'react'

/** The props `PageHeader` takes. */
interface PageHeaderProps {
  title: string
  /** The muted line under the title, when the page carries one. */
  subtitle?: string
  /** The row's right side — the page's toolbar, e.g. filter and insert. */
  actions?: ReactNode
}

/**
 * The title block every page opens with: an `h1` and, optionally, a muted
 * subtitle beneath it, with the page's actions on the same line, right-
 * aligned. Everything user-facing in `actions` arrives translated by the
 * caller — this component decides nothing.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle !== undefined ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
