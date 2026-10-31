import { useTranslation } from 'react-i18next'
import type { Transaction } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Ellipsis, Layers, Lock, Pencil, Split, Trash2 } from 'lucide-react'

import { InitialsAvatar } from '@workspace/ui/components/initials-avatar'
import { StatusPill } from '@workspace/ui/components/status-pill'
import { cn } from 'cn'

import { asOutflow, formatMoney } from '@/lib/format-money.js'
import { CategoryPill } from './category-pill.js'
import { StatusBadge } from './status-badge.js'
import type {
  TransactionGridLabels,
  TransactionRowActions,
} from './transaction-grid.js'

function signedAmount(transaction: Transaction, locale: string): string {
  return transaction.type === 'Income'
    ? formatMoney(transaction.amount, locale, transaction.currency, {
        signed: true,
      })
    : formatMoney(asOutflow(transaction.amount), locale, transaction.currency)
}

function amountTone(transaction: Transaction): string {
  return transaction.type === 'Income' ? 'text-positive' : 'text-foreground'
}

function metaLine(transaction: Transaction): string {
  return [
    transaction.accountName,
    transaction.installmentGroupId !== null
      ? `${transaction.installmentNumber}/${transaction.installmentCount}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
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

  return (
    <div
      role="row"
      className={cn(
        'grid grid-cols-[2.25rem_4rem_minmax(0,1.4fr)_minmax(0,1fr)_9.5rem_7.5rem_5rem] items-center gap-x-5 border-b border-border px-4 py-2.5 text-sm transition-colors hover:bg-surface-2/60',
        selected && 'bg-primary-soft/50'
      )}
    >
      <span role="cell">
        <Checkbox
          checked={selected}
          aria-label={labels.selectRow}
          onCheckedChange={() => onToggleRow(transaction)}
        />
      </span>
      <span role="cell" className="text-[0.8125rem] text-muted-foreground">
        {new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: 'short',
        }).format(new Date(`${transaction.transactionDt}T00:00:00`))}
      </span>
      <span role="cell" className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={transaction.name} kind="organization" size="sm" />
        <span className="flex min-w-0 flex-col">
          <span
            className="flex min-w-0 items-center gap-2 font-medium"
            title={transaction.name}
          >
            <span className="truncate">{transaction.name}</span>
            {transaction.isAdjustment ? (
              <StatusPill tone="neutral" className="h-5 px-2 text-[0.6875rem]">
                {t('transactions.adjustment-badge')}
              </StatusPill>
            ) : null}
          </span>
          <span
            className="truncate text-[0.8125rem] text-muted-foreground"
            title={transaction.accountName}
          >
            {metaLine(transaction)}
          </span>
        </span>
      </span>
      <span role="cell" className="min-w-0">
        <CategoryPill
          name={transaction.categoryName}
          color={transaction.categoryColor}
        />
      </span>
      <span role="cell" className="flex flex-col items-end">
        <span
          className={`text-[0.9375rem] font-semibold ${amountTone(transaction)}`}
        >
          {signedAmount(transaction, locale)}
        </span>
        <span
          className="text-xs text-muted-foreground"
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
      <span role="cell" className="flex items-center gap-1 pl-3">
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
      <div role="cell" className="flex items-center justify-end gap-0.5">
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
    <div className="border-b px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <span
          className="min-w-0 truncate text-[0.9375rem] font-medium"
          title={transaction.name}
        >
          {transaction.name}
          {transaction.isAdjustment ? (
            <StatusPill
              tone="neutral"
              className="ml-2 h-5 px-2 align-middle text-[0.6875rem]"
            >
              {t('transactions.adjustment-badge')}
            </StatusPill>
          ) : null}
          {isInstallment ? (
            <span className="ml-1 text-muted-foreground tabular-nums">
              {transaction.installmentNumber}/{transaction.installmentCount}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span
            className={`text-[0.9375rem] font-semibold whitespace-nowrap ${amountTone(transaction)}`}
          >
            {signedAmount(transaction, locale)}
          </span>
          <span
            className="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
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
          <CategoryPill
            name={transaction.categoryName}
            color={transaction.categoryColor}
            className="max-w-40"
          />
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
