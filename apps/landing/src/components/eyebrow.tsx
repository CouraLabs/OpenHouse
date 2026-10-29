import type { ReactNode } from 'react'

/**
 * A section's path name, set as a mono label (`/the house`). The Drafting
 * Sheet has no uppercase kickers: sections carry their own path.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.82rem] text-muted lowercase">
      <span aria-hidden>/</span>
      {children}
    </span>
  )
}
