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
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { IconTile } from '@workspace/ui/components/icon-tile'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { StatusPill } from '@workspace/ui/components/status-pill'
import type { Tone } from '@workspace/ui/lib/tones'

import { useAccountsSearch } from '@/features/accounts/use-accounts.js'
import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

const typeIcons: Record<AccountType, { icon: LucideIcon; tone: Tone }> = {
  Checking: { icon: Landmark, tone: 'in' },
  Wallet: { icon: Wallet, tone: 'orange' },
  Savings: { icon: PiggyBank, tone: 'olive' },
  'Credit Card': { icon: CreditCard, tone: 'slate' },
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
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('main.balances')}</CardTitle>
        <CardDescription>{t('home.balances-subtitle')}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/accounts" />}
          >
            {t('main.see-all')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {accounts.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : accounts.isError ? (
          <p className="text-sm text-negative">{t('main.balances-error')}</p>
        ) : items.length === 0 ? (
          <Empty className="py-6">
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
          <ul className="flex flex-col">
            {items.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function AccountRow({ account }: { account: Account }) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = typeIcons[account.type]
  const locale = formattingLocale()
  const meta = [
    t(`accounts.type-${account.type.toLowerCase()}`),
    account.type === 'Credit Card' &&
    account.closeDay !== null &&
    account.dueDay !== null
      ? `${t('accounts.due-short')} ${String(account.dueDay).padStart(2, '0')}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="flex items-center gap-3 py-2.5">
      <IconTile tone={tone} size="lg" className="rounded-xl">
        <Icon />
      </IconTile>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 text-[0.9375rem] font-medium">
          <span className="truncate">{account.name}</span>
          {account.isDefault ? (
            <StatusPill tone="primary" className="h-5 px-2 text-[0.6875rem]">
              {t('accounts.default-badge')}
            </StatusPill>
          ) : null}
        </span>
        <span className="truncate text-[0.8125rem] text-muted-foreground">
          {meta}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[0.9375rem] font-semibold">
          {formatMoney(account.balance, locale, account.currency)}
        </span>
        {account.availableLimit !== null ? (
          <span className="text-xs text-muted-foreground">
            {t('main.available', {
              amount: formatMoney(
                account.availableLimit,
                locale,
                account.currency
              ),
            })}
          </span>
        ) : null}
      </span>
    </li>
  )
}
