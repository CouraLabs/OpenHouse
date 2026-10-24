import type { ReactNode } from 'react'

/** The button row that closes every step of the import: back/cancel on the
 * left of the primary action, right-aligned, stacked on a narrow screen. */
export function ImportStepActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {children}
    </div>
  )
}
