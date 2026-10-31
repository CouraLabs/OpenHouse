import { useTranslation } from 'react-i18next'
import type { CreditCardStatement, Transaction } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMoveToStatement } from '@/lib/statements.js'
import { useBillTransactions, useMarkChecked } from './use-bills.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ReconcileCandidates({ bill }: { bill: CreditCardStatement }) {
  const { t } = useTranslation()
  const move = useMoveToStatement()
  const check = useMarkChecked()
  const nearClose = useBillTransactions({
    sort: [{ field: 'transactionDt', dir: 'asc' }],
    filter: {
      linkedAccountId: bill.accountId,
      transactionDtFrom: bill.window.start,
      transactionDtTo: bill.window.end,
      creditMode: 'accrual',
      lifecycle: 'ACTIVE',
    },
    skip: 0,
    limit: 100,
  })
  const unchecked = useBillTransactions({
    sort: [{ field: 'transactionDt', dir: 'asc' }],
    filter: {
      statementId: bill.id,
      status: 'Verify',
      creditMode: 'accrual',
      lifecycle: 'ACTIVE',
    },
    skip: 0,
    limit: 100,
  })
  const late = (nearClose.data?.items ?? []).filter(
    (row) => row.statementId !== null && row.statementId !== bill.id
  )
  const rows: Array<{ row: Transaction; action: 'move' | 'check' }> = [
    ...late.map((row) => ({ row, action: 'move' as const })),
    ...(unchecked.data?.items ?? []).map((row) => ({
      row,
      action: 'check' as const,
    })),
  ]

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('bills.reconcile-no-candidates')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {t('bills.reconcile-candidates')}
      </span>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {rows.map(({ row, action }) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted/50"
          >
            <span className="flex flex-col">
              <span className="text-sm">{row.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDayLabel(row.transactionDt, formattingLocale())}
                {' · '}
                {formatMoney(
                  row.type === 'Income' ? `-${row.amount}` : row.amount,
                  formattingLocale(),
                  row.currency
                )}
              </span>
            </span>
            {action === 'move' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={move.isPending}
                onClick={() =>
                  move.mutate({ id: row.id, statementId: bill.id })
                }
              >
                {t('bills.reconcile-move')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={check.isPending}
                onClick={() => check.mutate(row.id)}
              >
                {t('bills.reconcile-check')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
