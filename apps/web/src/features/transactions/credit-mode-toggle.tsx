import type { CreditMode } from '@workspace/dto'
import { CalendarClock, ShoppingCart } from 'lucide-react'

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group'

export function CreditModeToggle({
  value,
  onChange,
  labels,
}: {
  value: CreditMode
  onChange: (mode: CreditMode) => void
  labels: { group: string; accrual: string; cash: string }
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={labels.group}
      value={[value]}
      onValueChange={(next) => {
        const [mode] = next as CreditMode[]
        if (mode) onChange(mode)
      }}
    >
      <ToggleGroupItem value="accrual" title={labels.accrual} aria-label={labels.accrual}>
        <ShoppingCart data-icon="inline-start" />
        <span className="hidden min-[1100px]:inline">{labels.accrual}</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="cash" title={labels.cash} aria-label={labels.cash}>
        <CalendarClock data-icon="inline-start" />
        <span className="hidden min-[1100px]:inline">{labels.cash}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
