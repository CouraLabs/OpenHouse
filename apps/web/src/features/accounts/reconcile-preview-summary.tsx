import { useTranslation } from 'react-i18next'
import type { ReconcilePreview } from '@workspace/poco'
import { isZeroMoney } from '@workspace/poco'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ReconcilePreviewSummary({
  preview,
}: {
  preview: ReconcilePreview
}) {
  const { t } = useTranslation()
  const money = (amount: string) =>
    formatMoney(amount, formattingLocale(), preview.currency)
  const matches = isZeroMoney(preview.difference)

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 text-sm">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">
          {t('accounts.reconcile-computed')}
        </dt>
        <dd
          className="text-right tabular-nums"
          data-testid="reconcile-computed"
        >
          {money(preview.computedBalance)}
        </dd>
        <dt className="text-muted-foreground">
          {t('accounts.reconcile-bank')}
        </dt>
        <dd className="text-right tabular-nums">
          {money(preview.bankBalance)}
        </dd>
        <dt className="font-medium">{t('accounts.reconcile-difference')}</dt>
        <dd
          className={`text-right font-medium tabular-nums ${
            matches
              ? 'text-primary'
              : 'text-destructive'
          }`}
          data-testid="reconcile-difference"
        >
          {money(preview.difference)}
        </dd>
      </dl>
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          {t('accounts.reconcile-verify-title', { count: preview.verifyCount })}
        </p>
        {preview.verifyRows.length === 0 ? (
          <p className="text-muted-foreground">
            {t('accounts.reconcile-verify-empty')}
          </p>
        ) : (
          <ul className="flex max-h-40 flex-col gap-1 overflow-auto">
            {preview.verifyRows.map((row) => (
              <li key={row.id} className="flex items-center gap-2">
                <span className="text-muted-foreground tabular-nums">
                  {formatDayLabel(row.transactionDt, formattingLocale())}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="tabular-nums">
                  {row.type === 'Income' ? '+' : '−'}
                  {money(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
