import type { ReactNode } from 'react'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.82rem] text-muted lowercase">
      <span aria-hidden>/</span>
      {children}
    </span>
  )
}
