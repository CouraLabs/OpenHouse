import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreditCardStatement } from '@workspace/poco'
import { addMoney, isZeroMoney, negateMoney } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DialogFooter } from '@workspace/ui/components/dialog'
import { MoneyField } from '@workspace/ui/components/money-field'

import { formatMoney } from '@/lib/format-money.js'
import {
  useReconcileStatement,
  useUpdateBankFigures,
} from '@/lib/statements.js'
import { ReconcileCandidates } from './reconcile-candidates.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ReconcileFields({
  bill,
  onClose,
}: {
  bill: CreditCardStatement
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [bankTotal, setBankTotal] = useState(bill.bankTotal ?? '')
  const [minimumDue, setMinimumDue] = useState(bill.minimumDue ?? '')
  const save = useUpdateBankFigures()
  const reconcile = useReconcileStatement()
  const difference =
    bankTotal === '' ? null : addMoney(bankTotal, negateMoney(bill.total))
  const matches = difference !== null && isZeroMoney(difference)
  const figures = {
    id: bill.id,
    bankTotal: bankTotal === '' ? null : bankTotal,
    minimumDue: minimumDue === '' ? null : minimumDue,
  }
  const failure = save.error ?? reconcile.error

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MoneyField
          locale={formattingLocale()}
          label={t('bills.reconcile-bank-total')}
          labelFor="reconcile-bank-total"
          placeholder={t('bills.pay-amount-placeholder')}
          value={bankTotal}
          onValueChange={setBankTotal}
        />
        <MoneyField
          locale={formattingLocale()}
          label={t('bills.minimum-due')}
          labelFor="reconcile-minimum-due"
          placeholder={t('bills.pay-amount-placeholder')}
          value={minimumDue}
          onValueChange={setMinimumDue}
        />
      </div>
      {difference === null ? null : (
        <p
          className={`text-sm ${matches ? 'text-muted-foreground' : 'text-destructive'}`}
        >
          {matches
            ? t('bills.reconcile-matches')
            : t('bills.reconcile-difference', {
                amount: formatMoney(difference, formattingLocale(), bill.currency),
              })}
        </p>
      )}
      {difference !== null && !matches ? (
        <ReconcileCandidates bill={bill} />
      ) : null}
      {failure !== null ? (
        <p className="text-sm text-destructive">
          {failure instanceof Error ? failure.message : t('bills.error')}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('bills.cancel')}
        </Button>
        <Button
          variant="outline"
          disabled={save.isPending}
          onClick={() => save.mutate(figures, { onSuccess: onClose })}
        >
          {t('bills.reconcile-save')}
        </Button>
        <Button
          disabled={!matches || reconcile.isPending}
          onClick={() =>
            save.mutate(figures, {
              onSuccess: () =>
                reconcile.mutate(
                  { id: bill.id, bankTotal },
                  { onSuccess: onClose }
                ),
            })
          }
        >
          {reconcile.isPending
            ? t('bills.reconciling')
            : t('bills.reconcile-confirm')}
        </Button>
      </DialogFooter>
    </div>
  )
}
