import type { CreditCardStatement } from '@workspace/poco'
import { Card, CardContent } from '@workspace/ui/components/card'
import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/lib/format-money.js'

/**
 * A bill's figures, in the order a bank bill reads them: what the earlier
 * bills left, this cycle's charges and credits, what was paid, and what is
 * due — every amount in the card's currency.
 */
export function StatementSummary({
  bill,
  locale,
}: {
  bill: CreditCardStatement
  locale: string
}) {
  const { t } = useTranslation()
  const figures = [
    { label: t('bills.previous-balance'), amount: bill.previousBalance },
    { label: t('bills.charges'), amount: bill.charges },
    { label: t('bills.credits'), amount: bill.credits },
    { label: t('bills.paid'), amount: bill.paid },
  ]

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {figures.map((figure) => (
          <div key={figure.label} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {figure.label}
            </span>
            <span className="tabular-nums">
              {formatMoney(figure.amount, locale, bill.currency)}
            </span>
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('bills.amount-due')}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(bill.amountDue, locale, bill.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
