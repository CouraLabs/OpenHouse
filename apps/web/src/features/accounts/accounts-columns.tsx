import type { Account } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Link } from '@tanstack/react-router'
import {
  ChartLine,
  FileUp,
  Pencil,
  ReceiptText,
  Scale,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

/** What the actions column can do to a row, reported upward. */
export interface AccountRowActions {
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  /** Opens the reconciliation against the bank's balance. */
  onReconcile: (account: Account) => void
  /** Opens the daily end-of-day balance chart. */
  onHistory: (account: Account) => void
}

/**
 * The columns the accounts grid shows: the id, the account — its name with
 * the type beside it, and the agency/number pair beneath, joined by the
 * conversion spread when the account has one — and the balance
 * with, for a credit card, the free credit and the due/close days beneath.
 * The caller owns what edit and delete do; the columns only route the
 * events. Called during the page's render, so the labels arrive translated.
 */
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
      id: 'id',
      header: '#',
      enableSorting: false,
      cell: (context) => context.row.original.id,
    },
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
                // Shown only when set: most accounts never convert.
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
        // A credit card's free credit is its limit minus what is spent on
        // it; the other types have no limit, so no free credit.
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
                // A card from before the days were required has no bills
                // until its owner sets them.
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

/** The actions cell: a card's bills shortcut, then the edit and delete
 * buttons, one per row. */
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
      {account.type === 'Credit Card' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('accounts.bills')}
          title={t('accounts.bills')}
          nativeButton={false}
          render={<Link to="/bills" search={{ accountId: account.id }} />}
        >
          <ReceiptText />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('accounts.import')}
        title={t('accounts.import')}
        nativeButton={false}
        render={
          <Link
            to="/accounts/$accountId/import"
            params={{ accountId: String(account.id) }}
          />
        }
      >
        <FileUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('accounts.reconcile')}
        title={t('accounts.reconcile')}
        onClick={() => actions.onReconcile(account)}
      >
        <Scale />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('accounts.history')}
        title={t('accounts.history')}
        onClick={() => actions.onHistory(account)}
      >
        <ChartLine />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('accounts.edit')}
        title={t('accounts.edit')}
        onClick={() => actions.onEdit(account)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={t('accounts.delete')}
        title={t('accounts.delete')}
        onClick={() => actions.onDelete(account)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
