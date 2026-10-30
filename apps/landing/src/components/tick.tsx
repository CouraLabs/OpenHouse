import type { CSSProperties } from 'react'

export function Tick({ x, y }: { x: string; y: string }) {
  return (
    <span
      aria-hidden
      className="tick"
      style={{ left: x, top: y } as CSSProperties}
    />
  )
}
