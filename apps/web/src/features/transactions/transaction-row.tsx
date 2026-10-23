import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Layers, Pencil, Split, Trash2 } from 'lucide-react'

import { formatMoney } from '@/lib/format-money.js'
import { StatusBadge } from './status-badge.js'
import type {
  TransactionGridLabels,
  TransactionRowActions,
} from './transaction-grid.js'

/** One transaction's row: when, category with the account it moved
 * through, description, amount, status, actions. */
export function TransactionRow({
  transaction,
  locale,
  labels,
  selected,
  onToggleRow,
  actions,
}: {
  transaction: Transaction
  locale: string
  labels: TransactionGridLabels
  selected: boolean
  onToggleRow: (transaction: Transaction) => void
  actions: TransactionRowActions
}) {
  const { t } = useTranslation()
  const isIncome = transaction.type === 'Income'
  const isInstallment = transaction.installmentGroupId !== null
  // A card charge on a bill, not part of a purchase or a transfer, can still
  // be split into installments.
  const canSplit =
    !isInstallment &&
    transaction.type === 'Expense' &&
    transaction.statementId !== null &&
    transaction.transferGroupId === null
  const signed = `${isIncome ? '+' : '\u2212'}${formatMoney(transaction.amount, locale, transaction.currency)}`

  return (
    <div className="grid grid-cols-[2.5rem_10rem_1fr_1fr_10rem_7rem_7rem] items-center gap-2 border-b px-3 py-2 text-sm hover:bg-muted/40">
      <Checkbox
        checked={selected}
        aria-label={labels.selectRow}
        onCheckedChange={() => onToggleRow(transaction)}
      />
      <span className="tabular-nums">
        {new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
        }).format(new Date(`${transaction.transactionDt}T00:00:00`))}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Badge
          variant="outline"
          style={
            transaction.categoryColor === ''
              ? undefined
              : {
                  borderColor: transaction.categoryColor,
                  color: transaction.categoryColor,
                }
          }
        >
          {transaction.categoryName}
        </Badge>
        <span
          className="truncate text-muted-foreground"
          title={transaction.accountName}
        >
          {transaction.accountName}
        </span>
      </span>
      <span className="truncate" title={transaction.name}>
        {transaction.name}
        {isInstallment ? (
          <span className="ml-1 text-muted-foreground tabular-nums">
            {transaction.installmentNumber}/{transaction.installmentCount}
          </span>
        ) : null}
      </span>
      <span
        className={`text-right font-medium tabular-nums ${
          isIncome
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {signed}
      </span>
      <span>
        <StatusBadge
          status={transaction.status}
          onChange={(status) => actions.onStatusChange(transaction, status)}
        />
      </span>
      <div className="flex items-center justify-end gap-1">
        {isInstallment ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('transactions.group')}
            title={t('transactions.group')}
            onClick={() => actions.onInstallments(transaction)}
          >
            <Layers />
          </Button>
        ) : null}
        {canSplit ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('transactions.split')}
            title={t('transactions.split')}
            onClick={() => actions.onSplit(transaction)}
          >
            <Split />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('transactions.edit')}
          title={t('transactions.edit')}
          onClick={() => actions.onEdit(transaction)}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label={t('transactions.delete')}
          title={t('transactions.delete')}
          onClick={() => actions.onDelete(transaction)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
