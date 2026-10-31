import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Ellipsis,
  Layers,
  Lock,
  Pencil,
  Split,
  Trash2,
} from 'lucide-react'

import { formatMoney } from '@/lib/format-money.js'
import { StatusBadge } from './status-badge.js'
import type {
  TransactionGridLabels,
  TransactionRowActions,
} from './transaction-grid.js'

function signedAmount(transaction: Transaction, locale: string): string {
  const isIncome = transaction.type === 'Income'

  return `${isIncome ? '+' : '\u2212'}${formatMoney(transaction.amount, locale, transaction.currency)}`
}

function amountTone(transaction: Transaction): string {
  return transaction.type === 'Income'
    ? 'text-primary'
    : 'text-destructive'
}

function canSplitOf(transaction: Transaction): boolean {
  return (
    transaction.installmentGroupId === null &&
    transaction.type === 'Expense' &&
    transaction.statementId !== null &&
    transaction.transferGroupId === null
  )
}

function RowActionsMenu({
  transaction,
  actions,
}: {
  transaction: Transaction
  actions: TransactionRowActions
}) {
  const { t } = useTranslation()
  const isInstallment = transaction.installmentGroupId !== null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('transactions.more-actions')}
            title={t('transactions.more-actions')}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isInstallment ? (
          <DropdownMenuItem onClick={() => actions.onInstallments(transaction)}>
            <Layers />
            {t('transactions.group')}
          </DropdownMenuItem>
        ) : null}
        {canSplitOf(transaction) ? (
          <DropdownMenuItem onClick={() => actions.onSplit(transaction)}>
            <Split />
            {t('transactions.split')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => actions.onEdit(transaction)}>
          <Pencil />
          {t('transactions.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => actions.onDelete(transaction)}
        >
          <Trash2 />
          {t('transactions.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
  const isInstallment = transaction.installmentGroupId !== null

  return (
    <div
      role="row"
      className="grid grid-cols-[2.5rem_10rem_1fr_1fr_10rem_7rem_7rem] items-center gap-2 border-b px-3 py-2 text-sm hover:bg-muted/40"
    >
      <span role="cell">
        <Checkbox
          checked={selected}
          aria-label={labels.selectRow}
          onCheckedChange={() => onToggleRow(transaction)}
        />
      </span>
      <span role="cell" className="tabular-nums">
        {new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
        }).format(new Date(`${transaction.transactionDt}T00:00:00`))}
      </span>
      <span role="cell" className="flex min-w-0 items-center gap-2">
        <Badge
          variant="outline"
          className="min-w-0 shrink justify-start"
          title={transaction.categoryName}
          style={
            transaction.categoryColor === ''
              ? undefined
              : {
                  borderColor: transaction.categoryColor,
                  color: transaction.categoryColor,
                }
          }
        >
          <span className="truncate">{transaction.categoryName}</span>
        </Badge>
        <span
          className="truncate text-muted-foreground"
          title={transaction.accountName}
        >
          {transaction.accountName}
        </span>
      </span>
      <span role="cell" className="truncate" title={transaction.name}>
        {transaction.name}
        {transaction.isAdjustment ? (
          <Badge variant="secondary" className="ml-2">
            {t('transactions.adjustment-badge')}
          </Badge>
        ) : null}
        {isInstallment ? (
          <span className="ml-1 text-muted-foreground tabular-nums">
            {transaction.installmentNumber}/{transaction.installmentCount}
          </span>
        ) : null}
      </span>
      <span role="cell" className="flex flex-col items-end">
        <span
          className={`font-medium tabular-nums ${amountTone(transaction)}`}
        >
          {signedAmount(transaction, locale)}
        </span>
        <span
          className="text-xs text-muted-foreground tabular-nums"
          title={t('transactions.running-balance')}
          data-testid="running-balance"
        >
          {formatMoney(
            transaction.runningBalance,
            locale,
            transaction.currency
          )}
        </span>
      </span>
      <span role="cell" className="flex items-center gap-1">
        {transaction.locked ? (
          <Lock
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-label={t('transactions.reconciled-lock')}
            role="img"
          />
        ) : null}
        <StatusBadge
          status={transaction.status}
          onChange={(status) => actions.onStatusChange(transaction, status)}
        />
      </span>
      <div role="cell" className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('transactions.edit')}
          title={t('transactions.edit')}
          onClick={() => actions.onEdit(transaction)}
        >
          <Pencil />
        </Button>
        <RowActionsMenu transaction={transaction} actions={actions} />
      </div>
    </div>
  )
}

export function TransactionCardRow({
  transaction,
  locale,
  actions,
}: {
  transaction: Transaction
  locale: string
  actions: TransactionRowActions
}) {
  const { t } = useTranslation()
  const isInstallment = transaction.installmentGroupId !== null

  return (
    <div className="border-b px-3 py-2.5 hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <span
          className="min-w-0 truncate text-sm font-medium"
          title={transaction.name}
        >
          {transaction.name}
          {transaction.isAdjustment ? (
            <Badge variant="secondary" className="ml-2 align-middle">
              {t('transactions.adjustment-badge')}
            </Badge>
          ) : null}
          {isInstallment ? (
            <span className="ml-1 text-muted-foreground tabular-nums">
              {transaction.installmentNumber}/{transaction.installmentCount}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span
            className={`text-sm font-medium tabular-nums whitespace-nowrap ${amountTone(transaction)}`}
          >
            {signedAmount(transaction, locale)}
          </span>
          <span
            className="text-xs text-muted-foreground tabular-nums whitespace-nowrap"
            title={t('transactions.running-balance')}
            data-testid="running-balance"
          >
            {formatMoney(
              transaction.runningBalance,
              locale,
              transaction.currency
            )}
          </span>
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="max-w-40 truncate"
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
          <span className="truncate" title={transaction.accountName}>
            {transaction.accountName}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {transaction.locked ? (
            <Lock
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label={t('transactions.reconciled-lock')}
              role="img"
            />
          ) : null}
          <StatusBadge
            status={transaction.status}
            onChange={(status) => actions.onStatusChange(transaction, status)}
          />
          <RowActionsMenu transaction={transaction} actions={actions} />
        </span>
      </div>
    </div>
  )
}
