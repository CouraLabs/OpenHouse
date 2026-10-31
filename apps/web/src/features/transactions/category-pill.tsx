import { cn } from 'cn'

export function CategoryPill({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  const hue = color === '' ? 'var(--data-slate)' : color

  return (
    <span
      title={name}
      className={cn(
        'inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${hue} 16%, transparent)`,
        color: `color-mix(in oklab, ${hue} 62%, var(--foreground))`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: hue }}
      />
      <span className="truncate">{name}</span>
    </span>
  )
}
