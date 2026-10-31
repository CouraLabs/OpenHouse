import { cn } from 'cn'

import { toneFill, type Tone } from '@workspace/ui/lib/tones'

export function RingGauge({
  fraction,
  tone = 'primary',
  size = 44,
  className,
}: {
  fraction: number
  tone?: Tone
  size?: number
  className?: string
}) {
  const clamped = Math.min(Math.max(fraction, 0), 1)
  const radius = 15.5
  const length = 2 * Math.PI * radius

  return (
    <svg
      aria-hidden
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={cn('shrink-0 -rotate-90', className)}
    >
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke={toneFill[tone]}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${clamped * length} ${length}`}
        className="transition-[stroke-dasharray] duration-400 ease-spring"
      />
    </svg>
  )
}
