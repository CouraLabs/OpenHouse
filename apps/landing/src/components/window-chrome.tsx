import type { ReactNode } from 'react'
import { cn } from 'cn'

/**
 * A faux-OS window: a white title bar with three light-gray dots and an
 * optional monospace title, then the content.
 */
export function WindowChrome({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-line bg-surface overflow-hidden rounded-[20px] border',
        className
      )}
    >
      <div className="border-line relative flex h-9 items-center border-b px-3.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="bg-line size-2.5 rounded-full" />
          <span className="bg-line size-2.5 rounded-full" />
          <span className="bg-line size-2.5 rounded-full" />
        </div>
        {title && (
          <span className="absolute inset-x-0 text-center font-mono text-[11px] text-muted">
            {title}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
