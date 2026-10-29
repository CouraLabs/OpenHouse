import { useInView } from '@/lib/use-in-view.js'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * A goal's progress as a thin ring with the percentage set in the mono
 * display face at its center. The arc draws itself once the ring scrolls into view.
 */
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
          strokeWidth="4"
          className="stroke-bone"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-ink ease-out-expo transition-[stroke-dashoffset] duration-1000 motion-reduce:transition-none"
        />
      </svg>
      <span className="text-ink font-display absolute inset-0 flex items-center justify-center text-2xl font-medium tracking-tight">
        {percent}%
      </span>
    </div>
  )
}
