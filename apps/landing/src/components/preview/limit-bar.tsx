import { useInView } from '@/lib/use-in-view.js'

export function LimitBar({
  label,
  spent,
  cap,
  percent,
}: {
  label: string
  spent: string
  cap: string
  percent: number
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const fill =
    percent >= 100
      ? 'var(--alert)'
      : percent >= 80
        ? 'var(--data-orange)'
        : 'var(--data-in)'

  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4 text-[0.8125rem]">
        <span className="text-ink min-w-0 truncate font-medium">{label}</span>
        <span className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums">
          <span className="text-ink font-semibold">{spent}</span> / {cap}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          style={{
            transform: `scaleX(${inView ? Math.min(percent, 100) / 100 : 0})`,
            backgroundColor: fill,
          }}
          className="ease-out-expo h-full origin-left rounded-full transition-transform duration-700 motion-reduce:transition-none"
        />
      </div>
    </div>
  )
}
