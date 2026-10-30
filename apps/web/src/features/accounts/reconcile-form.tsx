import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account } from '@workspace/poco'
import { isZeroMoney } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { DialogFooter } from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { useTenantToday } from '@/lib/settings.js'
import { useDebouncedValue } from '@/lib/use-debounced-value.js'
import { ReconcilePreviewSummary } from './reconcile-preview-summary.js'
import { useReconcile, useReconcilePreview } from './use-reconciliation.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ReconcileForm({
  account,
  onDone,
  onCancel,
}: {
  account: Account
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const today = useTenantToday()
  const [date, setDate] = useState(today)
  const [bankBalance, setBankBalance] = useState('')
  const [markChecked, setMarkChecked] = useState(false)

  const settledBalance = useDebouncedValue(bankBalance)
  const preview = useReconcilePreview(account.id, {
    date,
    bankBalance: settledBalance,
  })
  const reconcile = useReconcile()

  const result =
    preview.data !== undefined && settledBalance === bankBalance
      ? preview.data
      : undefined
  const differs = result !== undefined && !isZeroMoney(result.difference)
  const createAdjustment = differs

  const submit = () =>
    reconcile.mutate(
      {
        accountId: account.id,
        date,
        bankBalance,
        markChecked,
        createAdjustment,
      },
      { onSuccess: onDone }
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 items-start gap-3">
        <Field>
          <FieldLabel htmlFor="reconcile-date">
            {t('accounts.reconcile-date')}
          </FieldLabel>
          <DatePicker
            id="reconcile-date"
            locale={formattingLocale()}
            value={parseDateOnly(date)}
            onChange={(picked) => setDate(formatDateOnly(picked))}
            labels={{
              placeholder: t('accounts.reconcile-date'),
              today: t('accounts.today'),
            }}
          />
        </Field>
        <MoneyField
          locale={formattingLocale()}
          className="h-8"
          label={t('accounts.reconcile-bank-balance')}
          labelFor="reconcile-bank-balance"
          placeholder={t('accounts.amount-placeholder')}
          value={bankBalance}
          onValueChange={setBankBalance}
          required
        />
      </div>
      {preview.isError ? (
        <p className="text-sm text-destructive">
          {preview.error instanceof Error
            ? preview.error.message
            : t('accounts.error')}
        </p>
      ) : null}
      {result !== undefined ? (
        <ReconcilePreviewSummary preview={result} />
      ) : null}
      {result !== undefined ? (
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id="reconcile-mark-checked"
              checked={markChecked}
              onCheckedChange={(checked) => setMarkChecked(checked === true)}
            />
            <label htmlFor="reconcile-mark-checked">
              {t('accounts.reconcile-mark-checked')}
            </label>
          </div>
          {differs ? (
            <div className="flex items-center gap-2">
              <Checkbox id="reconcile-create-adjustment" checked disabled />
              <label htmlFor="reconcile-create-adjustment">
                {t('accounts.reconcile-create-adjustment')}
              </label>
            </div>
          ) : null}
          {differs ? (
            <p className="text-muted-foreground">
              {t('accounts.reconcile-adjustment-hint')}
            </p>
          ) : null}
        </div>
      ) : null}
      {reconcile.isError ? (
        <p className="text-sm text-destructive">
          {reconcile.error instanceof Error
            ? reconcile.error.message
            : t('accounts.error')}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          variant="outline"
          disabled={reconcile.isPending}
          onClick={onCancel}
        >
          {t('accounts.cancel')}
        </Button>
        <Button
          disabled={result === undefined || reconcile.isPending}
          onClick={submit}
        >
          {reconcile.isPending
            ? t('accounts.saving')
            : t('accounts.reconcile-confirm')}
        </Button>
      </DialogFooter>
    </div>
  )
}
