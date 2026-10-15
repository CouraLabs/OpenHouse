import { Badge } from '@workspace/ui/components/badge'
import { X } from 'lucide-react'

/**
 * One applied filter, rendered as a removable chip. Removing it clears the
 * value in the page's filter state.
 */
export interface FilterChipValue {
  /** The chip's text, already localized and value-filled by the page. */
  label: string
  /** Clears this filter; the page resets paging with it. */
  onClear: () => void
}

/**
 * The applied filters, shown as removable chips before the table: the
 * month, and every dialog filter the user set.
 */
export function FilterChips({ chips }: { chips: FilterChipValue[] }) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.label} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            aria-label={chip.label}
            className="rounded-sm p-0.5 hover:bg-muted"
            onClick={chip.onClear}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
