import { ChartColumn, List } from 'lucide-react'

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group'

/** What the transactions page body shows: the grid, or the metric cards. */
export type TransactionsView = 'transactions' | 'metrics'

/**
 * The two-way switch between the transaction grid and the metric cards.
 * Exactly one side is always pressed: pressing the active one keeps it.
 */
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
