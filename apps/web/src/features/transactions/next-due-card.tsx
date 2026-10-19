import { Link } from '@tanstack/react-router'
import type { CreditCardStatement } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CalendarClock } from 'lucide-react'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

/**
 * What each card asks for next: its latest closed bill's amount due — which
 * already carries every earlier remainder, so nothing is counted twice —
 * and its due date, in red once overdue.
 */
export function NextDueCard({
  title,
  bills,
  locale,
  labels,
}: {
  title: string
  /** The latest closed, unpaid bill per card. */
  bills: CreditCardStatement[]
  locale: string
  labels: { empty: string; dueOn: (due: string) => string; overdue: string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarClock aria-hidden className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          bills.map((bill) => {
            const overdue = bill.status === 'Overdue'

            return (
              <Link
                key={bill.id}
                to="/bills/$statementId"
                params={{ statementId: String(bill.id) }}
                className="flex items-center justify-between gap-2 rounded-md hover:bg-muted/50"
              >
                <span className="flex flex-col">
                  <span className="text-sm">{bill.accountName}</span>
                  <span
                    className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {overdue
                      ? labels.overdue
                      : labels.dueOn(formatDayLabel(bill.dueDate, locale))}
                  </span>
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${overdue ? 'text-destructive' : ''}`}
                >
                  {formatMoney(bill.amountDue, locale, bill.currency)}
                </span>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
