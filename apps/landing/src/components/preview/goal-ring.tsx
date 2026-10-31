import { useInView } from '@/lib/use-in-view.js'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function GoalRing({ percent }: { percent: number }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const offset = CIRCUMFERENCE * (1 - (inView ? percent : 0) / 100)

  return (
    <div ref={ref} className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          className="stroke-surface-2"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="ease-out-expo stroke-data-blue transition-[stroke-dashoffset] duration-1000 motion-reduce:transition-none"
        />
      </svg>
      <span className="text-ink absolute inset-0 flex items-center justify-center text-xl font-bold tracking-[-0.02em] tabular-nums">
        {percent}%
      </span>
    </div>
  )
}
