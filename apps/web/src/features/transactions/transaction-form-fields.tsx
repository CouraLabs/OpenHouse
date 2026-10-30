import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type {
  CreateTransactionBody,
  InstallmentsBody,
  ReceiverRef,
  SplitInput,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@workspace/poco'
import {
  createTransactionSchema,
  inferCategory,
  transactionStatuses,
  transactionTypes,
} from '@workspace/poco'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group'
import { Textarea } from '@workspace/ui/components/textarea'
import { TextField } from '@workspace/ui/components/text-field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { BilledOnLine } from './billed-on-line.js'
import { InstallmentFields } from './installment-fields.js'
import { PurchasePreview } from './purchase-preview.js'
import { SplitSection } from '@/components/split-section.js'
import { useSession } from '@/lib/auth.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useHouseholdMembers } from '@/lib/household.js'
import { StringPick } from './string-pick.js'
import {
  useActiveAccounts,
  useActiveCategories,
  useActiveReceivers,
} from './use-transactions.js'
import { formattingLocale } from '@/lib/i18n.js'

const transactionFormSchema = createTransactionSchema

export type TransactionFormInput = z.input<typeof transactionFormSchema>

export interface TransactionFormFieldsProps {
  transaction: Transaction | null
  defaultDt: string
  draft?: Partial<TransactionFormInput>
  onSubmit: (body: CreateTransactionBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

export function TransactionFormFields({
  transaction,
  defaultDt,
  draft,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: TransactionFormFieldsProps) {
  const { t } = useTranslation()
  const session = useSession()
  const mainCurrency = useMainCurrency()
  const {
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<TransactionFormInput, unknown, CreateTransactionBody>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues:
      transaction === null
        ? {
            ...newValues(defaultDt),
            paidByUserId: session.data?.user.id,
            ...draft,
          }
        : {
            name: transaction.name,
            note: transaction.note ?? undefined,
            invoice: transaction.invoice ?? '',
            amount: transaction.amount,
            transactionDt: transaction.transactionDt,
            linkedAccountId: transaction.linkedAccountId,
            categoryId: transaction.categoryId,
            receiverId: transaction.receiverId ?? undefined,
            paidByUserId: transaction.paidByUserId ?? undefined,
            type: transaction.type,
            status: transaction.status,
            statusNote: transaction.statusNote ?? undefined,
          },
  })

  const type = watch('type')
  const status = watch('status')
  const amount = watch('amount')
  const transactionDt = watch('transactionDt')
  const accountId = watch('linkedAccountId')
  const categoryId = watch('categoryId')
  const receiverId = watch('receiverId')
  const paidByUserId = watch('paidByUserId')
  const touchedSplit = watch('split')
  const members = useHouseholdMembers()

  const isTransfer =
    transaction !== null && transaction.transferGroupId !== null
  const isInstallment =
    transaction !== null && transaction.installmentGroupId !== null
  const watchedInstallments = watch('installments')
  const installments: InstallmentsBody = {
    count: watchedInstallments?.count ?? 1,
    amountMode: watchedInstallments?.amountMode ?? 'total',
  }
  const [cashPrice, setCashPrice] = useState('')
  const existingSplit: SplitInput | null =
    transaction !== null && transaction.splits.length > 0
      ? {
          mode: 'exact',
          entries: transaction.splits.map((share) => ({
            userId: share.userId,
            value: share.share,
          })),
        }
      : null
  const shownSplit = touchedSplit === undefined ? existingSplit : touchedSplit

  const accounts = useActiveAccounts()
  const categories = useActiveCategories()
  const receivers = useActiveReceivers()
  const account = (accounts.data ?? []).find(
    (candidate) => candidate.id === accountId
  )
  const isShareable = type === 'Expense' && !isTransfer && !isInstallment
  const isCardPurchase =
    transaction === null &&
    type === 'Expense' &&
    account?.type === 'Credit Card'

  useEffect(() => {
    if (transaction !== null || accountId !== undefined) {
      return
    }

    const preferred = (accounts.data ?? []).find((account) => account.isDefault)

    if (preferred !== undefined) {
      setValue('linkedAccountId', preferred.id, { shouldValidate: true })
    }
  }, [transaction, accountId, accounts.data, setValue])

  const categoryPicked = useRef(transaction !== null)

  const inferFromName = (name: string) => {
    if (categoryPicked.current) {
      return
    }

    setValue(
      'categoryId',
      inferCategory(name, categories.data ?? [])?.id ??
        (undefined as unknown as number)
    )
  }

  return (
    <FormSheet
      title={
        transaction === null
          ? t('transactions.new-title')
          : t('transactions.edit-title')
      }
      submitLabel={isSaving ? t('transactions.saving') : t('transactions.save')}
      cancelLabel={t('transactions.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit(
        ({ installments: split, split: shares, ...values }) => {
          const body = isShareable ? { ...values, split: shares } : values

          onSubmit(
            isCardPurchase && split !== undefined && split.count > 1
              ? { ...body, installments: split }
              : body
          )
        }
      )}
    >
      <TextField
        type="text"
        label={t('transactions.name')}
        labelFor="transaction-name"
        placeholder={t('transactions.name-placeholder')}
        required
        readOnly={isInstallment}
        error={errors.name}
        {...register('name', {
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            inferFromName(event.target.value),
        })}
      />
      <Field data-invalid={errors.type !== undefined}>
        <FieldLabel>{t('transactions.type')}</FieldLabel>
        <RadioGroup
          value={type}
          disabled={isTransfer || isInstallment}
          onValueChange={(value) =>
            setValue('type', value as TransactionType, {
              shouldValidate: true,
            })
          }
          className="grid-cols-2"
        >
          {transactionTypes.map((value) => (
            <span
              key={value}
              className="flex items-center gap-2 rounded-lg border p-2 text-sm has-[[data-checked]]:border-primary"
            >
              <RadioGroupItem value={value} />
              {t(`transactions.type-${value.toLowerCase()}`)}
            </span>
          ))}
        </RadioGroup>
        {errors.type !== undefined ? (
          <FieldError>{errors.type.message}</FieldError>
        ) : null}
      </Field>
      <MoneyField
        locale={formattingLocale()}
        label={t('transactions.amount')}
        labelFor="transaction-amount"
        placeholder={t('transactions.amount-placeholder')}
        value={amount}
        onValueChange={(value) =>
          setValue('amount', value, { shouldValidate: true })
        }
        error={errors.amount}
        required
      />
      <Field data-invalid={errors.transactionDt !== undefined}>
        <FieldLabel htmlFor="transaction-dt">
          {t('transactions.date')}
          <RequiredMark />
        </FieldLabel>
        <DatePicker
          id="transaction-dt"
          disabled={isInstallment}
          locale={formattingLocale()}
          value={parseDateOnly(transactionDt)}
          onChange={(date) =>
            setValue('transactionDt', formatDateOnly(date), {
              shouldValidate: true,
            })
          }
          labels={{
            placeholder: t('transactions.date-placeholder'),
            today: t('transactions.date-placeholder'),
          }}
        />
        {errors.transactionDt !== undefined ? (
          <FieldError>{errors.transactionDt.message}</FieldError>
        ) : null}
      </Field>
      <StringPick
        id="transaction-account"
        label={t('transactions.account')}
        required
        disabled={isTransfer || isInstallment}
        value={accountId === undefined ? undefined : String(accountId)}
        placeholder={t('transactions.filter-account-placeholder')}
        onChange={(value) =>
          setValue(
            'linkedAccountId',
            value === undefined
              ? (undefined as unknown as number)
              : Number(value),
            { shouldValidate: true }
          )
        }
        error={errors.linkedAccountId?.message}
        options={(accounts.data ?? [])
          .filter(
            (account) =>
              transaction === null || account.currency === transaction.currency
          )
          .map((account) => ({
            value: String(account.id),
            label: account.name,
          }))}
      />
      {isCardPurchase && account !== undefined ? (
        <>
          <InstallmentFields
            value={installments}
            onChange={(value) =>
              setValue('installments', value, { shouldValidate: true })
            }
            cashPrice={cashPrice}
            onCashPriceChange={setCashPrice}
            error={errors.installments?.count}
          />
          <PurchasePreview
            amount={amount}
            installments={installments}
            cashPrice={cashPrice}
            availableLimit={account.availableLimit}
            currency={account.currency}
          />
        </>
      ) : null}
      <BilledOnLine
        account={account}
        transactionDt={transactionDt}
        pinnedDueDate={
          transaction?.statementPinned === true &&
          transaction.linkedAccountId === accountId
            ? transaction.statementDueDate
            : null
        }
      />
      <StringPick
        id="transaction-category"
        label={t('transactions.category')}
        required
        value={categoryId === undefined ? undefined : String(categoryId)}
        placeholder={t('transactions.filter-category-placeholder')}
        onChange={(value) => {
          categoryPicked.current = true
          setValue(
            'categoryId',
            value === undefined
              ? (undefined as unknown as number)
              : Number(value),
            { shouldValidate: true }
          )
          const preset = (categories.data ?? []).find(
            (category) => String(category.id) === value
          )?.defaultSplit

          if (transaction === null && touchedSplit == null && preset != null) {
            setValue('split', preset)
          }
        }}
        error={errors.categoryId?.message}
        options={(categories.data ?? []).map((category) => ({
          value: String(category.id),
          label: category.name,
        }))}
      />
      <StringPick
        id="transaction-receiver"
        label={t('transactions.receiver')}
        disabled={isInstallment}
        value={receiverId == null ? undefined : String(receiverId)}
        placeholder={t('transactions.receiver-placeholder')}
        onChange={(value) =>
          setValue(
            'receiverId',
            value === undefined ? undefined : Number(value)
          )
        }
        options={[
          {
            value: '',
            label: t('transactions.receiver-placeholder'),
          },
          ...(receivers.data ?? []).map((receiver: ReceiverRef) => ({
            value: String(receiver.id),
            label: receiver.name,
          })),
        ]}
      />
      {isShareable ? (
        <>
          <StringPick
            id="transaction-paid-by"
            label={t('split.paid-by')}
            value={paidByUserId == null ? undefined : String(paidByUserId)}
            placeholder={t('split.paid-by-placeholder')}
            onChange={(value) =>
              setValue(
                'paidByUserId',
                value === undefined ? undefined : Number(value)
              )
            }
            options={(members.data ?? [])
              .filter((member) => member.isActive || member.id === paidByUserId)
              .map((member) => ({
                value: String(member.id),
                label: member.name,
              }))}
          />
          <SplitSection
            idPrefix="transaction-split"
            value={shownSplit}
            onChange={(next) => setValue('split', next)}
            amount={touchedSplit === undefined ? undefined : amount}
            currency={account?.currency ?? mainCurrency}
            payerUserId={paidByUserId ?? null}
          />
        </>
      ) : null}
      <TextField
        type="text"
        label={t('transactions.invoice')}
        labelFor="transaction-invoice"
        placeholder={t('transactions.invoice-placeholder')}
        readOnly={isInstallment}
        error={errors.invoice}
        {...register('invoice', {
          setValueAs: (value) => (value === '' ? undefined : value),
        })}
      />
      <Field data-invalid={errors.note !== undefined}>
        <FieldLabel htmlFor="transaction-note">
          {t('transactions.note')}
        </FieldLabel>
        <Textarea
          id="transaction-note"
          placeholder={t('transactions.note-placeholder')}
          {...register('note')}
        />
        {errors.note !== undefined ? (
          <FieldError>{errors.note.message}</FieldError>
        ) : null}
      </Field>
      <StringPick
        id="transaction-status"
        label={t('transactions.status')}
        value={status}
        placeholder={t('transactions.status-placeholder')}
        onChange={(value) =>
          setValue('status', (value ?? 'Verify') as TransactionStatus, {
            shouldValidate: true,
          })
        }
        options={transactionStatuses.map((value) => ({
          value,
          label: t(`transactions.status-${value.toLowerCase()}`),
        }))}
      />
      {status !== undefined && status !== 'Verify' ? (
        <TextField
          type="text"
          label={t('transactions.status-note')}
          labelFor="transaction-status-note"
          placeholder={t('transactions.status-note-placeholder')}
          error={errors.statusNote}
          {...register('statusNote')}
        />
      ) : null}
    </FormSheet>
  )
}

function newValues(defaultDt: string): TransactionFormInput {
  return {
    name: '',
    note: undefined,
    invoice: '',
    amount: '',
    transactionDt: defaultDt,
    linkedAccountId: undefined as unknown as number,
    categoryId: undefined as unknown as number,
    receiverId: undefined,
    type: 'Expense',
    status: 'Checked' as TransactionStatus,
    statusNote: undefined,
  }
}
