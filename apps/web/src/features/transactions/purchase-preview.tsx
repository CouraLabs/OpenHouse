import { useTranslation } from 'react-i18next'
import type { Currency, InstallmentsBody } from '@workspace/dto'
import { amountSchema } from '@workspace/dto'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useDebouncedValue } from '@/lib/use-debounced-value.js'
import { useInstallmentsPreview } from './use-transactions.js'

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
  availableLimit: string | null
  currency: Currency
}) {
  const { t } = useTranslation()
  const count =
    Number.isInteger(installments.count) && installments.count >= 1
      ? installments.count
      : 1
  const settledAmount = useDebouncedValue(amount)
  const settledCashPrice = useDebouncedValue(cashPrice)
  const validAmount = amountSchema.safeParse(amount).success
  const preview = useInstallmentsPreview(
    validAmount
      ? {
          amount: settledAmount,
          count,
          amountMode: installments.amountMode,
          cashPrice: amountSchema.safeParse(settledCashPrice).success
            ? settledCashPrice
            : undefined,
          availableLimit,
        }
      : null
  )

  if (!validAmount || preview.data === undefined) {
    return null
  }

  const { parts, total, extra, availableAfter, availableAfterTone } =
    preview.data
  const money = (value: string) =>
    formatMoney(value, formattingLocale(), currency)

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
      {availableAfter !== null ? (
        <span
          className={
            availableAfterTone === 'negative' ? 'text-destructive' : undefined
          }
        >
          {availableAfterTone === 'negative'
            ? t('transactions.over-limit', { amount: money(availableAfter) })
            : t('transactions.available-after', {
                amount: money(availableAfter),
              })}
        </span>
      ) : null}
    </div>
  )
}
