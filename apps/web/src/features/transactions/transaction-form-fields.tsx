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
import { Button } from '@workspace/ui/components/button'
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

/**
 * The fields the transaction form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const transactionFormSchema = createTransactionSchema

/** The form's values, before the schema's defaults apply. */
export type TransactionFormInput = z.input<typeof transactionFormSchema>

/** The props `TransactionFormFields` takes. */
export interface TransactionFormFieldsProps {
  /** The transaction being edited, or nothing while creating. */
  transaction: Transaction | null
  /** The day a new transaction starts on — today, whatever month the grid
   * shows. */
  defaultDt: string
  /** Values a new transaction starts from instead — a refund prefilled
   * from the purchase it refunds. */
  draft?: Partial<TransactionFormInput>
  /** What a submit should do; the page decides where it saves. */
  onSubmit: (body: CreateTransactionBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/**
 * The fields of the transaction sheet. Rendered inside the sheet's content,
 * which unmounts on close, so every opening mounts it fresh with the values
 * of the transaction it edits — no reset effect to keep in step.
 */
export function TransactionFormFields({
  transaction,
  defaultDt,
  draft,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: TransactionFormFieldsProps) {
  const { t, i18n } = useTranslation()
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
  // Undefined is "untouched": a new expense is unsplit, an edit keeps the
  // shares it has (the API scales them to a new amount). Once the user
  // touches the editor the value is theirs; null clears it.
  const touchedSplit = watch('split')
  const members = useHouseholdMembers()

  // A transfer side's type and account pair it with its sibling; the API
  // rejects a change to either, so the form locks them.
  const isTransfer =
    transaction !== null && transaction.transferGroupId !== null
  // One installment alone changes only its amount, category, note, and
  // status; the rest is the purchase's, edited as a group.
  const isInstallment =
    transaction !== null && transaction.installmentGroupId !== null
  // The form watches zod's input type, where `amountMode` is optional (it
  // has a default); the split components need the parsed shape, so fill
  // the defaults here.
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
  // A new card expense may split into installments, and previews the limit
  // it leaves.
  const isShareable = type === 'Expense' && !isTransfer && !isInstallment
  const isCardPurchase =
    transaction === null &&
    type === 'Expense' &&
    account?.type === 'Credit Card'

  // A new transaction starts in the tenant's default account. The accounts
  // may still be loading when the sheet opens, so this follows the query
  // until it answers or the user chooses one.
  useEffect(() => {
    if (transaction !== null || accountId !== undefined) {
      return
    }

    const preferred = (accounts.data ?? []).find((account) => account.isDefault)

    if (preferred !== undefined) {
      setValue('linkedAccountId', preferred.id, { shouldValidate: true })
    }
  }, [transaction, accountId, accounts.data, setValue])

  // Whether the user picked the category themselves. Until they do, a new
  // transaction's category follows the description as it is typed; read
  // only in event handlers, so it is a ref, not state.
  const categoryPicked = useRef(transaction !== null)

  /** Re-infers the category of a new transaction from its description:
   * the best fuzzy match against the tenant's categories, or none. */
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
    <form
      onSubmit={handleSubmit(
        ({ installments: split, split: shares, ...values }) => {
          // Only an expense is shared; a type switched away drops the split.
          const body = isShareable ? { ...values, split: shares } : values

          onSubmit(
            isCardPurchase && split !== undefined && split.count > 1
              ? { ...body, installments: split }
              : body
          )
        }
      )}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        type="text"
        label={t('transactions.name')}
        labelFor="transaction-name"
        placeholder={t('transactions.name-placeholder')}
        required
        // readOnly, not disabled: a disabled input submits no value.
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
        locale={i18n.language}
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
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </FieldLabel>
        <DatePicker
          id="transaction-dt"
          disabled={isInstallment}
          locale={i18n.language}
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
          // A transaction carries its account's currency: an edit may
          // move it only to an account of the same currency, or the
          // same digits would silently mean other money.
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
        // A charge pinned to its bill stays there through a date edit, as
        // long as it stays on the same card.
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
          // A category's default split ("Rent: 60/40") seeds a new expense
          // the user has not shaped yet.
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
          // An empty field is no invoice: the wire carries nothing, not ''.
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
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('transactions.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('transactions.saving') : t('transactions.save')}
        </Button>
      </div>
    </form>
  )
}

/** The values a new transaction starts with: today's day, the review
 * already checked, and nothing else picked for the user yet. */
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
