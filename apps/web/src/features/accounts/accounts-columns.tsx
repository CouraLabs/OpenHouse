import type { Account } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Link } from '@tanstack/react-router'
import {
  ChartLine,
  Ellipsis,
  FileUp,
  Pencil,
  ReceiptText,
  Scale,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

export interface AccountRowActions {
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onReconcile: (account: Account) => void
  onHistory: (account: Account) => void
}

export function buildAccountsColumns(
  t: (key: string) => string,
  locale: string,
  actions: AccountRowActions
): Array<DataTableColumn<Account>> {
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 2,
  })

  return [
    {
      accessorKey: 'name',
      header: t('accounts.account'),
      cell: (context) => {
        const account = context.row.original

        return (
          <div className="flex flex-col">
            <span className="flex items-center gap-2">
              {account.name}{' '}
              <span className="text-muted-foreground">
                ({t(`accounts.type-${account.type.toLowerCase()}`)})
              </span>
              {account.isDefault ? (
                <Badge variant="secondary">{t('accounts.default-badge')}</Badge>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {[
                [account.agency, account.number].filter(Boolean).join(' / '),
                Number(account.spreadPct) > 0
                  ? `${t('accounts.spread-short')} ${percent.format(Number(account.spreadPct) / 100)}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        )
      },
    },
    {
      id: 'balance',
      header: t('accounts.balance'),
      cell: (context) => {
        const account = context.row.original
        const freeCredit =
          account.type === 'Credit Card' && account.limit !== null
            ? Number(account.limit) - Number(account.balance)
            : null

        return (
          <div className="flex flex-col">
            <span>
              {formatMoney(account.balance, locale, account.currency)}
              {freeCredit !== null ? (
                <span className="text-muted-foreground">
                  {' '}
                  ({formatMoney(String(freeCredit), locale, account.currency)})
                </span>
              ) : null}
            </span>
            {account.reconciledThrough !== null ? (
              <span className="text-xs text-muted-foreground">
                {t('accounts.reconciled-through')}{' '}
                {formatDayLabel(account.reconciledThrough, locale, {
                  dateStyle: 'medium',
                })}
              </span>
            ) : null}
            {account.type === 'Credit Card' ? (
              account.closeDay === null || account.dueDay === null ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {t('accounts.cycle-missing')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('accounts.due-short')}{' '}
                  {String(account.dueDay).padStart(2, '0')}
                  {' · '}
                  {t('accounts.close-short')}{' '}
                  {String(account.closeDay).padStart(2, '0')}
                </span>
              )
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <AccountActionsCell account={context.row.original} actions={actions} />
      ),
    },
  ]
}

function AccountActionsCell({
  account,
  actions,
}: {
  account: Account
  actions: AccountRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('accounts.edit')}
        title={t('accounts.edit')}
        onClick={() => actions.onEdit(account)}
      >
        <Pencil />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('accounts.more-actions')}
              title={t('accounts.more-actions')}
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {account.type === 'Credit Card' ? (
            <DropdownMenuItem
              render={
                <Link to="/bills" search={{ accountId: account.id }} />
              }
            >
              <ReceiptText />
              {t('accounts.bills')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            render={
              <Link
                to="/accounts/$accountId/import"
                params={{ accountId: String(account.id) }}
              />
            }
          >
            <FileUp />
            {t('accounts.import')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onReconcile(account)}>
            <Scale />
            {t('accounts.reconcile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onHistory(account)}>
            <ChartLine />
            {t('accounts.history')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => actions.onDelete(account)}
          >
            <Trash2 />
            {t('accounts.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
