import { Link } from '@tanstack/react-router'
import { daysBetween, type CreditCardStatement } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreditCard } from 'lucide-react'

import { formatMoney } from '@/lib/format-money.js'

/**
 * The current bill of each card: the open bill's total so far, and how
 * many days are left until it closes. Each card's money stays in its own
 * currency — never summed across cards.
 */
export function CurrentBillCard({
  title,
  bills,
  today,
  locale,
  labels,
}: {
  title: string
  /** One open bill per card — the earliest to close. */
  bills: CreditCardStatement[]
  today: string
  locale: string
  labels: { empty: string; closesIn: (days: number) => string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CreditCard aria-hidden className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          bills.map((bill) => (
            <Link
              key={bill.id}
              to="/bills/$statementId"
              params={{ statementId: String(bill.id) }}
              className="flex items-center justify-between gap-2 rounded-md hover:bg-muted/50"
            >
              <span className="flex flex-col">
                <span className="text-sm">{bill.accountName}</span>
                <span className="text-xs text-muted-foreground">
                  {labels.closesIn(daysBetween(today, bill.closesOn))}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(bill.total, locale, bill.currency)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
