import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InstallmentGroup } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'

import { InstallmentGroupEditFields } from './installment-group-edit-fields.js'
import { useInstallmentActions } from './use-transactions.js'

type GroupAction = 'remaining' | 'all' | 'refund' | 'collapse'

type Step =
  { kind: 'menu' } | { kind: 'edit' } | { kind: 'confirm'; action: GroupAction }

export function InstallmentGroupBody({
  group,
  onClose,
}: {
  group: InstallmentGroup
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>({ kind: 'menu' })
  const { remove, refund, collapse } = useInstallmentActions()
  const mutations = [remove, refund, collapse]
  const pending = mutations.some((mutation) => mutation.isPending)
  const failure = mutations.find((mutation) => mutation.isError)?.error

  const run = (action: GroupAction) => {
    const options = { onSuccess: onClose }

    if (action === 'refund') {
      refund.mutate(
        {
          groupId: group.groupId,
          name: t('transactions.group-refund-name', { name: group.name }),
        },
        options
      )
    } else if (action === 'collapse') {
      collapse.mutate(group.groupId, options)
    } else {
      remove.mutate({ groupId: group.groupId, scope: action }, options)
    }
  }

  if (step.kind === 'edit') {
    return (
      <InstallmentGroupEditFields
        group={group}
        onBack={() => setStep({ kind: 'menu' })}
        onDone={onClose}
      />
    )
  }

  if (step.kind === 'confirm') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          {t(`transactions.group-confirm-${step.action}`)}
        </p>
        {failure !== undefined ? (
          <p className="text-sm text-destructive">
            {failure instanceof Error
              ? failure.message
              : t('transactions.error')}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setStep({ kind: 'menu' })}
          >
            {t('transactions.group-back')}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => run(step.action)}
          >
            {pending
              ? t('transactions.group-working')
              : t('transactions.group-confirm')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {group.editable ? null : (
        <p className="text-sm text-muted-foreground">
          {t('transactions.group-billed')}
        </p>
      )}
      <Button variant="outline" onClick={() => setStep({ kind: 'edit' })}>
        {t('transactions.group-edit')}
      </Button>
      <Button
        variant="outline"
        onClick={() => setStep({ kind: 'confirm', action: 'remaining' })}
      >
        {t('transactions.group-delete-remaining')}
      </Button>
      <Button
        variant="outline"
        onClick={() => setStep({ kind: 'confirm', action: 'refund' })}
      >
        {t('transactions.group-refund')}
      </Button>
      <Button
        variant="outline"
        disabled={!group.editable}
        onClick={() => setStep({ kind: 'confirm', action: 'collapse' })}
      >
        {t('transactions.group-collapse')}
      </Button>
      <Button
        variant="outline"
        className="text-destructive hover:text-destructive"
        disabled={!group.editable}
        onClick={() => setStep({ kind: 'confirm', action: 'all' })}
      >
        {t('transactions.group-delete-all')}
      </Button>
    </div>
  )
}
