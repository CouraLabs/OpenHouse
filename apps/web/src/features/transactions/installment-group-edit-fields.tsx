import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InstallmentGroup, InstallmentsBody } from '@workspace/poco'
import { updateInstallmentGroupSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { MoneyField } from '@workspace/ui/components/money-field'
import { TextField } from '@workspace/ui/components/text-field'

import { InstallmentFields } from './installment-fields.js'
import { PurchasePreview } from './purchase-preview.js'
import { useInstallmentActions } from './use-transactions.js'

/**
 * Edits an installment purchase as a whole: its name always, and its
 * amount and count while no installment is billed (the API answers 409
 * otherwise, and the message shows here). Category, receiver, and note
 * travel unchanged from the group. Mounts fresh with every opening.
 */
export function InstallmentGroupEditFields({
  group,
  onBack,
  onDone,
}: {
  group: InstallmentGroup
  onBack: () => void
  onDone: () => void
}) {
  const { t, i18n } = useTranslation()
  const { update } = useInstallmentActions()
  const [name, setName] = useState(group.name)
  const [amount, setAmount] = useState(group.total)
  const [installments, setInstallments] = useState<InstallmentsBody>({
    count: group.count,
    amountMode: 'total',
  })
  const [cashPrice, setCashPrice] = useState('')
  const parsed = updateInstallmentGroupSchema.safeParse({
    name,
    note: group.note,
    categoryId: group.categoryId,
    receiverId: group.receiverId,
    amount,
    installments,
  })

  return (
    <div className="flex flex-col gap-4">
      <TextField
        type="text"
        label={t('transactions.group-edit-name')}
        labelFor="installment-group-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <MoneyField
        locale={i18n.language}
        label={t('transactions.amount')}
        labelFor="installment-group-amount"
        placeholder={t('transactions.amount-placeholder')}
        value={amount}
        onValueChange={setAmount}
      />
      <InstallmentFields
        value={installments}
        onChange={setInstallments}
        cashPrice={cashPrice}
        onCashPriceChange={setCashPrice}
      />
      <PurchasePreview
        amount={amount}
        installments={installments}
        cashPrice={cashPrice}
        availableLimit={null}
        currency={group.currency}
      />
      {update.isError ? (
        <p className="text-sm text-destructive">
          {update.error instanceof Error
            ? update.error.message
            : t('transactions.error')}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('transactions.group-back')}
        </Button>
        <Button
          disabled={!parsed.success || update.isPending}
          onClick={() => {
            if (parsed.success) {
              update.mutate(
                { groupId: group.groupId, ...parsed.data },
                { onSuccess: onDone }
              )
            }
          }}
        >
          {update.isPending
            ? t('transactions.saving')
            : t('transactions.group-edit-save')}
        </Button>
      </div>
    </div>
  )
}
