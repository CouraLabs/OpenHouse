import { Plus } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from 'cn'

export function CreateCard({
  label,
  description,
  className,
  ...props
}: ComponentProps<'button'> & {
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      data-slot="create-card"
      className={cn(
        'flex min-h-40 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-foreground/15 p-6 text-center text-muted-foreground transition-[color,border-color,background-color] hover:border-primary/40 hover:bg-card/60 hover:text-foreground',
        className
      )}
      {...props}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-card text-primary shadow-soft">
        <Plus className="size-4" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[0.9375rem] font-semibold text-foreground">
          {label}
        </span>
        {description !== undefined ? (
          <span className="text-[0.8125rem]">{description}</span>
        ) : null}
      </span>
    </button>
  )
}
