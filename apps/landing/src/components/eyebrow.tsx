import type { ReactNode } from 'react'

/** The monospace kicker above a section title. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-[0.08em] text-muted uppercase">
      {children}
    </span>
  )
}
