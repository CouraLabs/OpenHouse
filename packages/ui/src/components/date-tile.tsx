import { cn } from 'cn'

export function DateTile({
  day,
  month,
  overdue = false,
  className,
}: {
  day: string
  month: string
  overdue?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-overdue={overdue}
      className={cn(
        'flex size-11 shrink-0 flex-col items-center justify-center rounded-[0.75rem] bg-surface-2 leading-none text-foreground data-[overdue=true]:bg-negative-soft data-[overdue=true]:text-negative',
        className
      )}
    >
      <span className="text-[0.9375rem] font-bold tabular-nums">{day}</span>
      <span className="mt-0.5 text-[0.625rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase in-data-[overdue=true]:text-negative">
        {month}
      </span>
    </span>
  )
}
