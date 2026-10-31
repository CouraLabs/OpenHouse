import { cn } from 'cn'

export function HouseGlyph({
  weight = 1.5,
  className,
}: {
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
      <path strokeWidth={weight} d="M50 12 L86 44 H14 Z" />
      <path strokeWidth={weight} d="M22 52 H78 V88 H22 Z" />
      <circle cx="50" cy="12" r="7" fill="var(--brand)" stroke="none" />
    </svg>
  )
}
