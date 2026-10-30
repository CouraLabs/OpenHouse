import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  AccountRef,
  CreditCardStatement,
  TransferBody,
} from '@workspace/poco'
import { compareMoney, transferSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { DialogFooter } from '@workspace/ui/components/dialog'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import { RefPick } from '@workspace/ui/components/ref-pick'
import { TextField } from '@workspace/ui/components/text-field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { useTenantToday } from '@/lib/settings.js'
import { useActiveCategories, usePayBill } from './use-bills.js'
import { formattingLocale } from '@/lib/i18n.js'

export function PayBillFields({
  bill,
  accounts,
  onClose,
}: {
  bill: CreditCardStatement
  accounts: AccountRef[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const today = useTenantToday()
  const categories = useActiveCategories()
  const pay = usePayBill()
  const {
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<TransferBody, unknown, TransferBody>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: accounts.find((account) => account.isDefault)
        ?.id as number,
      toAccountId: bill.accountId,
      paymentStatementId: bill.id,
      amount: compareMoney(bill.amountDue, '0') > 0 ? bill.amountDue : '',
      transactionDt: bill.dueDate > today ? bill.dueDate : today,
      categoryId: undefined,
      note: undefined,
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) =>
        pay.mutate(values, { onSuccess: onClose })
      )}
      className="flex flex-col gap-4"
      noValidate
    >
      <RefPick
        id="pay-from"
        label={t('bills.pay-from')}
        placeholder={t('bills.pay-from-placeholder')}
        value={watch('fromAccountId')}
        options={accounts}
        error={errors.fromAccountId?.message}
        onChange={(value) =>
          setValue('fromAccountId', value, { shouldValidate: true })
        }
      />
      <MoneyField
        locale={formattingLocale()}
        label={t('bills.pay-amount')}
        labelFor="pay-amount"
        placeholder={t('bills.pay-amount-placeholder')}
        value={watch('amount')}
        onValueChange={(value) =>
          setValue('amount', value, { shouldValidate: true })
        }
        error={errors.amount}
        required
      />
      <Field data-invalid={errors.transactionDt !== undefined}>
        <FieldLabel htmlFor="pay-dt">
          {t('bills.pay-date')}
          <RequiredMark />
        </FieldLabel>
        <DatePicker
          id="pay-dt"
          locale={formattingLocale()}
          value={parseDateOnly(watch('transactionDt'))}
          onChange={(date) =>
            setValue('transactionDt', formatDateOnly(date), {
              shouldValidate: true,
            })
          }
          labels={{
            placeholder: t('bills.pay-date-placeholder'),
            today: t('bills.pay-date-placeholder'),
          }}
        />
        {errors.transactionDt !== undefined ? (
          <FieldError>{errors.transactionDt.message}</FieldError>
        ) : null}
      </Field>
      <RefPick
        id="pay-category"
        label={t('bills.pay-category')}
        placeholder={t('transactions.card-payment-category')}
        value={watch('categoryId')}
        options={categories.data ?? []}
        required={false}
        onChange={(value) => setValue('categoryId', value)}
      />
      <TextField
        type="text"
        label={t('bills.pay-note')}
        labelFor="pay-note"
        error={errors.note}
        {...register('note')}
      />
      {pay.isError ? (
        <p className="text-sm text-destructive">
          {pay.error instanceof Error ? pay.error.message : t('bills.error')}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('bills.cancel')}
        </Button>
        <Button type="submit" disabled={pay.isPending}>
          {pay.isPending ? t('bills.paying') : t('bills.pay-confirm')}
        </Button>
      </DialogFooter>
    </form>
  )
}
