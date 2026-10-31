import type { TransactionBreakdownGroup } from '@workspace/dto'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { PieGroup } from './pie-group.js'

export function ExpensePieCard({
  title,
  icon,
  groups,
  locale,
  labels,
}: {
  title: string
  icon: React.ReactNode
  groups: TransactionBreakdownGroup[]
  locale: string
  labels: { other: string; empty: string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
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
