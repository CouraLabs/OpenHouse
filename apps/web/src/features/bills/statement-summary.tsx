import type { CreditCardStatement } from '@workspace/poco'
import { compareMoney, isPrepaid, negateMoney } from '@workspace/poco'
import { Card, CardContent } from '@workspace/ui/components/card'
import { useTranslation } from 'react-i18next'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

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

  const credit = compareMoney(bill.amountDue, '0') < 0
  const notes = [
    bill.carriedTo === null
      ? null
      : t(credit ? 'bills.credit-carried' : 'bills.remainder-carried', {
          amount: formatMoney(
            credit ? negateMoney(bill.amountDue) : bill.amountDue,
            locale,
            bill.currency
          ),
          due: formatDayLabel(bill.carriedTo, locale),
        }),
    isPrepaid(bill) ? t('bills.prepaid') : null,
    bill.minimumDue === null
      ? null
      : t('bills.minimum-due-note', {
          amount: formatMoney(bill.minimumDue, locale, bill.currency),
        }),
    bill.reconciledAt === null ? null : t('bills.reconciled'),
  ].filter((note) => note !== null)

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
        {notes.length === 0 ? null : (
          <ul className="col-span-full flex flex-col gap-1 text-sm text-muted-foreground">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
