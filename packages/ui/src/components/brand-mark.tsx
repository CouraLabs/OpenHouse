import { House } from 'lucide-react'
import { cn } from 'cn'

/**
 * The logo mark: a house glyph in a machined, double-bezeled tile — a tinted
 * outer tray holding the primary-colored core. Sized by the caller.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 rounded-[0.8rem] bg-primary/10 p-[3px] ring-1 ring-primary/15',
        className
      )}
    >
      <div className="flex flex-1 items-center justify-center rounded-[calc(0.8rem-3px)] bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
        <House className="size-[45%]" />
      </div>
    </div>
  )
}
