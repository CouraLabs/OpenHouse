import { Snowflake } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Account, AccountType } from '@workspace/dto'

import { CreateCard } from '@workspace/ui/components/create-card'
import {
  PaymentCard,
  type PaymentCardVariant,
} from '@workspace/ui/components/payment-card'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

const variants: Record<AccountType, PaymentCardVariant> = {
  Checking: 'emerald',
  Savings: 'olive',
  Wallet: 'coral',
  'Credit Card': 'onyx',
}

export function AccountCards({
  accounts,
  onCreate,
  onOpen,
}: {
  accounts: Account[]
  onCreate: () => void
  onOpen: (account: Account) => void
}) {
  const { t } = useTranslation()
  const locale = formattingLocale()

  return (
    <section
      aria-label={t('accounts.cards-label')}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {accounts.map((account) => {
        const frozen = account.status !== 'ACTIVE'
        const last4 = account.number?.replace(/\D/g, '').slice(-4)

        return (
          <button
            key={account.id}
            type="button"
            onClick={() => onOpen(account)}
            aria-label={t('accounts.card-open', { name: account.name })}
            className="rounded-2xl text-left transition-transform duration-150 outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <PaymentCard
              variant={frozen ? 'ice' : variants[account.type]}
              brand={account.name}
              tier={
                frozen ? (
                  <span className="flex items-center gap-1">
                    <Snowflake aria-hidden className="size-3" />
                    {t('accounts.card-frozen')}
                  </span>
                ) : (
                  t(`accounts.type-${account.type.toLowerCase()}`)
                )
              }
              identifier={
                last4 !== undefined && last4.length > 0
                  ? `•••• ${last4}`
                  : undefined
              }
              caption={t('accounts.card-balance')}
              title={formatMoney(account.balance, locale, account.currency)}
              corner={
                account.type === 'Credit Card' && account.dueDay !== null
                  ? t('accounts.card-due', {
                      day: String(account.dueDay).padStart(2, '0'),
                    })
                  : account.currency
              }
            />
          </button>
        )
      })}
      <CreateCard
        label={t('accounts.new')}
        description={t('accounts.card-create')}
        onClick={onCreate}
        className="aspect-[1.586] min-h-0"
      />
    </section>
  )
}
