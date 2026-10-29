import { cn } from 'cn'

/**
 * The OpenHouse primitive from `logos/openhouse-glyph.svg`: a roof over a
 * square, stroked, with one filled node dot at the ridge. `plot` draws the
 * strokes in by stroke-dashoffset, the square 380ms after the roof.
 */
export function HouseGlyph({
  plot = false,
  weight = 1.5,
  className,
}: {
  plot?: boolean
  /** Stroke width in the 112-unit box; scale it up for small glyphs. */
  weight?: number
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="-6 -6 112 112"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
    >
      <path
        className={cn(plot && 'plot-stroke')}
        pathLength={1}
        strokeWidth={weight}
        d="M50 12 L86 44 H14 Z"
      />
      <path
        className={cn(plot && 'plot-stroke [animation-delay:380ms]')}
        pathLength={1}
        strokeWidth={weight}
        d="M22 52 H78 V88 H22 Z"
      />
      <circle cx="50" cy="12" r="4.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
