import type { TransactionSummaryGroup } from '@workspace/poco'

import { SummaryRow, type SummaryLabels } from './summary-row.js'

export function SummaryCards({
  groups,
  locale,
  labels,
}: {
  groups: TransactionSummaryGroup[]
  locale: string
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
