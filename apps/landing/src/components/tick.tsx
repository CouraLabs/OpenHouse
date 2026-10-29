import type { CSSProperties } from 'react'

/**
 * A 13px crosshair marking where two rules meet. Positioned by its centre:
 * `x`/`y` are CSS lengths inside the nearest positioned ancestor.
 */
export function Tick({ x, y }: { x: string; y: string }) {
  return (
    <span
      aria-hidden
      className="tick"
      style={{ left: x, top: y } as CSSProperties}
    />
  )
}
