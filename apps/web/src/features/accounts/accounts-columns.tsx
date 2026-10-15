import type { Account } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatDayMonth } from '@/lib/format-day-month.js'
import { formatMoney } from '@/lib/format-money.js'

/** What the actions column can do to a row, reported upward. */
export interface AccountRowActions {
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

/**
 * The columns the accounts grid shows: the id, the account — its name with
 * the type beside it, and the agency/number pair beneath — and the balance
 * with, for a credit card, the free credit and the due/close dates beneath.
 * The caller owns what edit and delete do; the columns only route the
 * events. Called during the page's render, so the labels arrive translated.
 */
export function buildAccountsColumns(
  t: (key: string) => string,
  locale: string,
  actions: AccountRowActions
): Array<DataTableColumn<Account>> {
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
            <span>
              {account.name}{' '}
              <span className="text-muted-foreground">
                ({t(`accounts.type-${account.type.toLowerCase()}`)})
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {[account.agency, account.number].filter(Boolean).join(' / ')}
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
          account.type === 'Credit' && account.limit !== null
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
            {account.type === 'Credit' ? (
              <span className="text-xs text-muted-foreground">
                {formatDayMonth(account.dueDay, account.dueMonth)}
                {' · '}
                {formatDayMonth(account.closeDay, account.closeMonth)}
              </span>
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

/** The actions cell: the edit and delete buttons, one per row. */
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
