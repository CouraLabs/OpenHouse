import { ChartColumn, List } from 'lucide-react'

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group'

export type TransactionsView = 'transactions' | 'metrics'

export function ViewToggle({
  value,
  onChange,
  labels,
}: {
  value: TransactionsView
  onChange: (view: TransactionsView) => void
  labels: { group: string; transactions: string; metrics: string }
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={labels.group}
      value={[value]}
      onValueChange={(next) => {
        const [view] = next as TransactionsView[]
        if (view) onChange(view)
      }}
    >
      <ToggleGroupItem value="transactions">
        <List data-icon="inline-start" />
        {labels.transactions}
      </ToggleGroupItem>
      <ToggleGroupItem value="metrics">
        <ChartColumn data-icon="inline-start" />
        {labels.metrics}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
