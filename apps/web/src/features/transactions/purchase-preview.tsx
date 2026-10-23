import { useTranslation } from 'react-i18next'
import type { Currency, InstallmentsBody } from '@workspace/poco'
import {
  addMoney,
  amountSchema,
  compareMoney,
  negateMoney,
  splitInstallments,
  sumMoney,
} from '@workspace/poco'

import { formatMoney } from '@/lib/format-money.js'

/**
 * What a card purchase will do, before it is saved: how it splits (the
 * same `splitInstallments` the API writes with, so the preview never
 * drifts), what it costs over the cash price, and the card limit left —
 * the whole purchase holds the limit at once. A negative limit warns but
 * never blocks: the bank decides.
 */
export function PurchasePreview({
  amount,
  installments,
  cashPrice,
  availableLimit,
  currency,
}: {
  amount: string
  installments: InstallmentsBody
  cashPrice: string
  /** The card's available limit before this purchase, if it has a limit. */
  availableLimit: string | null
  currency: Currency
}) {
  const { t, i18n } = useTranslation()

  if (!amountSchema.safeParse(amount).success) {
    return null
  }

  const count =
    Number.isInteger(installments.count) && installments.count >= 1
      ? installments.count
      : 1
  const parts = splitInstallments(amount, count, installments.amountMode)
  const total = sumMoney(parts)
  const money = (value: string) => formatMoney(value, i18n.language, currency)
  const left =
    availableLimit === null
      ? null
      : addMoney(availableLimit, negateMoney(total))
  const extra =
    count > 1 &&
    installments.amountMode === 'perInstallment' &&
    amountSchema.safeParse(cashPrice).success
      ? addMoney(total, negateMoney(cashPrice))
      : null

  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      {count > 1 ? (
        <span>
          {parts[0] === parts[count - 1]
            ? t('transactions.installments-even', {
                count,
                amount: money(parts[1] ?? parts[0]),
                total: money(total),
              })
            : t('transactions.installments-uneven', {
                count,
                amount: money(parts[1]),
                first: money(parts[0]),
                total: money(total),
              })}
        </span>
      ) : null}
      {extra !== null ? (
        <span>
          {t('transactions.installments-extra', { amount: money(extra) })}
        </span>
      ) : null}
      {left !== null ? (
        <span
          className={
            compareMoney(left, '0') < 0 ? 'text-destructive' : undefined
          }
        >
          {compareMoney(left, '0') < 0
            ? t('transactions.over-limit', { amount: money(left) })
            : t('transactions.available-after', { amount: money(left) })}
        </span>
      ) : null}
    </div>
  )
}
