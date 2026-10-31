import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SettleSuggestion } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { formatMoney } from '@/lib/format-money.js'
import { useSettleUp } from '@/lib/household.js'
import { useTenantToday } from '@/lib/settings.js'
import { useActiveAccounts } from '@/features/transactions/use-transactions.js'
import { StringPick } from '@/features/transactions/string-pick.js'
import { formattingLocale } from '@/lib/i18n.js'

interface SettleFormProps {
  suggestion: SettleSuggestion
  onClose: () => void
}

export function SettleForm({ suggestion, onClose }: SettleFormProps) {
  const { t } = useTranslation()
  const today = useTenantToday()
  const accounts = useActiveAccounts()
  const settle = useSettleUp()
  const [fromAccountId, setFromAccountId] = useState<string | undefined>()
  const [toAccountId, setToAccountId] = useState<string | undefined>()
  const options = (accounts.data ?? [])
    .filter(
      (account) =>
        account.currency === suggestion.currency &&
        account.type !== 'Credit Card'
    )
    .map((account) => ({ value: String(account.id), label: account.name }))

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('household.settle-title')}</DialogTitle>
        <DialogDescription>
          {t('household.suggestion', {
            from: suggestion.fromName,
            to: suggestion.toName,
            amount: formatMoney(
              suggestion.amount,
              formattingLocale(),
              suggestion.currency
            ),
          })}
        </DialogDescription>
      </DialogHeader>
      <StringPick
        id="settle-from-account"
        label={t('household.settle-from-account', {
          name: suggestion.fromName,
        })}
        required
        value={fromAccountId}
        placeholder={t('household.settle-account-placeholder')}
        onChange={setFromAccountId}
        options={options}
      />
      <StringPick
        id="settle-to-account"
        label={t('household.settle-to-account', { name: suggestion.toName })}
        value={toAccountId}
        placeholder={t('household.settle-to-placeholder')}
        onChange={setToAccountId}
        options={[
          { value: '', label: t('household.settle-to-placeholder') },
          ...options,
        ]}
      />
      {settle.isError ? (
        <p className="text-sm text-destructive">
          {settle.error instanceof Error
            ? settle.error.message
            : t('household.error')}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('household.cancel')}
        </Button>
        <Button
          type="button"
          disabled={fromAccountId === undefined || settle.isPending}
          onClick={() =>
            settle.mutate(
              {
                fromUserId: suggestion.fromUserId,
                toUserId: suggestion.toUserId,
                amount: suggestion.amount,
                currency: suggestion.currency,
                fromAccountId: Number(fromAccountId),
                toAccountId:
                  toAccountId === undefined ? null : Number(toAccountId),
                transactionDt: today,
              },
              { onSuccess: onClose }
            )
          }
        >
          {settle.isPending ? t('household.settling') : t('household.settle')}
        </Button>
      </DialogFooter>
    </>
  )
}
