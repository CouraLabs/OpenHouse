import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CalendarClock } from 'lucide-react'

import { formatMoney } from '@/lib/format-money.js'
import type { ForecastSlice } from './forecast-next-month.js'

/**
 * The next month's card: what the recurring rules expect to spend, per
 * currency — every active expense rule the projection can place in the
 * coming month, totaled the way the cron will one day materialize it.
 */
export function NextMonthCard({
  title,
  slices,
  locale,
  labels,
}: {
  title: string
  slices: ForecastSlice[]
  locale: string
  /** The labels the card cannot derive, translated by the page. */
  labels: { expected: string; empty: string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarClock aria-hidden className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {slices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          slices.map((slice) => (
            <div
              key={slice.currency}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm text-muted-foreground">
                {labels.expected}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(slice.total, locale, slice.currency)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
