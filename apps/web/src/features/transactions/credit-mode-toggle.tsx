import type { CreditMode } from '@workspace/poco'
import { CalendarClock, ShoppingCart } from 'lucide-react'

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group'

/**
 * Which day the month reads card charges by: the purchase day (accrual,
 * the default) or the due date of the bill they land on (cash — when the
 * money leaves the paying account). Exactly one side is always pressed.
 */
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
      <ToggleGroupItem value="accrual" title={labels.accrual}>
        <ShoppingCart data-icon="inline-start" />
        {labels.accrual}
      </ToggleGroupItem>
      <ToggleGroupItem value="cash" title={labels.cash}>
        <CalendarClock data-icon="inline-start" />
        {labels.cash}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
