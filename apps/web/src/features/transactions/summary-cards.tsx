import type { TransactionSummaryGroup } from '@workspace/poco'

import { SummaryRow, type SummaryLabels } from './summary-row.js'

/**
 * The summary cards above the grid: one card holding the month's Incomes,
 * Expenses, and Net, and one for Credit Card Expenses — one card row per
 * currency the filtered accounts use, so a mixed-currency tenant never
 * reads a summed-across-currencies number.
 */
export function SummaryCards({
  groups,
  locale,
  labels,
}: {
  groups: TransactionSummaryGroup[]
  /** The BCP-47 tag the money figures format in. */
  locale: string
  /** The card's figures, translated by the page. */
  labels: SummaryLabels
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <SummaryRow
          key={group.currency}
          group={group}
          locale={locale}
          labels={labels}
        />
      ))}
    </div>
  )
}
