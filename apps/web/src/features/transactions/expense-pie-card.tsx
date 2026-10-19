import type { TransactionBreakdownGroup } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { PieGroup } from './pie-group.js'

/**
 * One expense pie: the month's expenses split by the dimension the card
 * names — the categories they belong to or the accounts they moved
 * through — one pie per currency the expenses use. A category paints in
 * the color its tenant picked; an account takes the series colors. The
 * legend under each pie carries every figure, so no slice means color
 * alone.
 */
export function ExpensePieCard({
  title,
  icon,
  groups,
  locale,
  labels,
}: {
  title: string
  /** The icon naming what the card shows, rendered beside the title. */
  icon: React.ReactNode
  groups: TransactionBreakdownGroup[]
  /** The BCP-47 tag the money figures format in. */
  locale: string
  /** The labels the chart cannot derive, translated by the page. */
  labels: { other: string; empty: string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          groups.map((group) => (
            <PieGroup
              key={group.currency}
              group={group}
              locale={locale}
              labels={labels}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
