import { cn } from 'cn'

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

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-ink min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums">
          {spent} / {cap}
        </span>
      </div>
      <div className="bg-bone h-1.5 overflow-hidden rounded-full">
        <div
          style={{ transform: `scaleX(${inView ? percent / 100 : 0})` }}
          className={cn(
            'ease-out-expo h-full origin-left rounded-full transition-transform duration-1000 motion-reduce:transition-none',
            percent >= 100
              ? 'bg-alert'
              : percent >= 80
                ? 'bg-attention'
                : 'bg-ink'
          )}
        />
      </div>
    </div>
  )
}
