import { Link } from '@tanstack/react-router'
import {
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Account, AccountType } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { EmptyMedia } from '@workspace/ui/components/empty'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from 'cn'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { useAccountsSearch } from '@/features/accounts/use-accounts.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

const typeIcons: Record<AccountType, LucideIcon> = {
  Checking: Landmark,
  Wallet: Wallet,
  Savings: PiggyBank,
  'Credit Card': CreditCard,
}

export function BalancesCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  const accounts = useAccountsSearch({
    sort: [{ field: 'name', dir: 'asc' }],
    filter: { status: 'ACTIVE' },
    skip: 0,
    limit: 100,
  })
  const items = accounts.data?.items ?? []

  return (
    <section
      className={cn(
        'rounded-[2rem] bg-foreground/[0.03] p-1.5 ring-1 ring-foreground/[0.06]',
        className
      )}
    >
      <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-xl leading-snug font-medium tracking-tight">
            {t('main.balances')}
          </h2>
          <Link
            to="/accounts"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {t('main.see-all')}
          </Link>
        </div>
        <div className="mt-3 flex flex-1 flex-col">
          {accounts.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : accounts.isError ? (
            <p className="text-sm text-destructive">
              {t('main.balances-error')}
            </p>
          ) : items.length === 0 ? (
            <Empty className="flex-1 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PiggyBank />
                </EmptyMedia>
                <EmptyTitle>{t('main.balances-empty-title')}</EmptyTitle>
                <EmptyDescription>{t('main.balances-empty')}</EmptyDescription>
              </EmptyHeader>
              <Button
                nativeButton={false}
                render={<Link to="/accounts" search={{}} />}
              >
                <Plus />
                {t('accounts.new')}
              </Button>
            </Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {items.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function AccountRow({ account }: { account: Account }) {
  const { t } = useTranslation()
  const Icon = typeIcons[account.type]

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-1 last:pb-0">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15"
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
              <span className="truncate">{account.name}</span>
              {account.isDefault ? (
                <Badge variant="secondary">{t('accounts.default-badge')}</Badge>
              ) : null}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t(`accounts.type-${account.type.toLowerCase()}`)}
              {account.agency !== null && account.number !== null
                ? ` · ${[account.agency, account.number].filter(Boolean).join(' / ')}`
                : ''}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
          {formatMoney(account.balance, formattingLocale(), account.currency)}
        </span>
      </div>
      <AccountFootnote account={account} />
    </li>
  )
}

function AccountFootnote({ account }: { account: Account }) {
  const { t } = useTranslation()

  if (account.type !== 'Credit Card') {
    return null
  }

  const days =
    account.closeDay === null || account.dueDay === null
      ? t('accounts.cycle-missing')
      : `${t('accounts.due-short')} ${String(account.dueDay).padStart(2, '0')} · ${t('accounts.close-short')} ${String(account.closeDay).padStart(2, '0')}`

  const free =
    account.availableLimit !== null
      ? t('main.available', {
          amount: formatMoney(
            account.availableLimit,
            formattingLocale(),
            account.currency
          ),
        })
      : null

  return (
    <span className="text-right text-xs text-muted-foreground tabular-nums">
      {[free, days].filter(Boolean).join(' · ')}
    </span>
  )
}
