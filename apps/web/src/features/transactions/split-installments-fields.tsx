import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InstallmentsBody, Transaction } from '@workspace/poco'
import { installmentsSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DialogFooter } from '@workspace/ui/components/dialog'

import { InstallmentFields } from './installment-fields.js'
import { PurchasePreview } from './purchase-preview.js'
import { useInstallmentActions } from './use-transactions.js'

export function SplitInstallmentsFields({
  transaction,
  onClose,
}: {
  transaction: Transaction
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState<InstallmentsBody>({
    count: 2,
    amountMode: 'total',
  })
  const [cashPrice, setCashPrice] = useState('')
  const { split } = useInstallmentActions()
  const parsed = installmentsSchema.safeParse(value)
  const valid = parsed.success && value.count > 1

  return (
    <div className="flex flex-col gap-4">
      <InstallmentFields
        value={value}
        onChange={setValue}
        cashPrice={cashPrice}
        onCashPriceChange={setCashPrice}
        error={
          parsed.success
            ? undefined
            : { message: parsed.error.issues[0].message }
        }
      />
      <PurchasePreview
        amount={transaction.amount}
        installments={value}
        cashPrice={cashPrice}
        availableLimit={null}
        currency={transaction.currency}
      />
      {split.isError ? (
        <p className="text-sm text-destructive">
          {split.error instanceof Error
            ? split.error.message
            : t('transactions.error')}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('transactions.cancel')}
        </Button>
        <Button
          disabled={!valid || split.isPending}
          onClick={() =>
            split.mutate(
              { id: transaction.id, ...value },
              { onSuccess: onClose }
            )
          }
        >
          {split.isPending
            ? t('transactions.saving')
            : t('transactions.split-confirm')}
        </Button>
      </DialogFooter>
    </div>
  )
}
