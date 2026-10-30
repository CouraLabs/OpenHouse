import { Badge } from '@workspace/ui/components/badge'
import { X } from 'lucide-react'

export interface FilterChipValue {
  label: string
  onClear: () => void
}

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
