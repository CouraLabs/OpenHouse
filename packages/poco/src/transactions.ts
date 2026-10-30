import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import type { StatementWarning } from './credit-card-statements.js'
import type { Currency } from './currencies.js'
import { dateOnlySchema } from './goals.js'
import { amountSchema } from './limits.js'
import { splitInputSchema } from './splits.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

export const transactionTypes = ['Income', 'Expense'] as const

export const transactionTypeSchema = z.enum(transactionTypes, {
  error: 'Income or expense.',
})

export type TransactionType = (typeof transactionTypes)[number]

export const transactionStatuses = ['Verify', 'Canceled', 'Checked'] as const

export const transactionStatusSchema = z.enum(transactionStatuses, {
  error: 'Pick a status.',
})

export type TransactionStatus = (typeof transactionStatuses)[number]

export const transactionDtSchema = dateOnlySchema

export const transactionRangeSchema = z.object({
  transactionDtFrom: transactionDtSchema.optional(),
  transactionDtTo: transactionDtSchema.optional(),
})

export const MAX_INSTALLMENTS = 48

export const installmentAmountModes = ['total', 'perInstallment'] as const

export const installmentAmountModeSchema = z.enum(installmentAmountModes, {
  error: 'Total or per installment.',
})

export type InstallmentAmountMode = (typeof installmentAmountModes)[number]

export const installmentsSchema = z.object({
  count: z
    .number({ error: 'Enter how many installments.' })
    .int('Enter a whole number of installments.')
    .min(1, 'At least 1 installment.')
    .max(MAX_INSTALLMENTS, `At most ${MAX_INSTALLMENTS} installments.`),
  amountMode: installmentAmountModeSchema.prefault('total'),
})

export const createTransactionSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
  note: z.string().max(2000, 'Keep the note under 2000 characters.').nullish(),
  invoice: z
    .string()
    .max(255, 'Keep the invoice under 255 characters.')
    .nullish(),
  amount: amountSchema,
  transactionDt: transactionDtSchema,
  linkedAccountId: z
    .number({ error: 'Pick an account.' })
    .int()
    .positive('Pick an account.'),
  categoryId: z
    .number({ error: 'Pick a category.' })
    .int()
    .positive('Pick a category.'),
  receiverId: z.number().int().positive().nullish(),
  type: transactionTypeSchema,
  status: transactionStatusSchema.prefault('Verify'),
  statusNote: z
    .string()
    .max(500, 'Keep the note under 500 characters.')
    .nullish(),
  confirmReconciled: z.boolean().optional(),
  installments: installmentsSchema.optional(),
  paidByUserId: z.number().int().positive().nullish(),
  split: splitInputSchema.nullish(),
})

export const updateTransactionSchema = createTransactionSchema
  .omit({ installments: true })
  .extend({
    id: z.number().int().positive(),
  })

export const updateInstallmentGroupSchema = createTransactionSchema
  .pick({
    name: true,
    note: true,
    categoryId: true,
    receiverId: true,
    amount: true,
    paidByUserId: true,
    split: true,
  })
  .extend({ installments: installmentsSchema })

export const installmentDeleteScopes = ['all', 'remaining'] as const

export const installmentDeleteScopeSchema = z.enum(installmentDeleteScopes, {
  error: 'All or remaining.',
})

export type InstallmentDeleteScope = (typeof installmentDeleteScopes)[number]

export const deleteInstallmentGroupSchema = z.object({
  scope: installmentDeleteScopeSchema.prefault('all'),
})

export const refundInstallmentGroupSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
})

export const changeTransactionStatusSchema = z.object({
  id: z.number().int().positive(),
  status: transactionStatusSchema,
  confirmReconciled: z.boolean().optional(),
})

export const deleteTransactionQuerySchema = z.object({
  confirmReconciled: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type DeleteTransactionQuery = z.infer<
  typeof deleteTransactionQuerySchema
>

export const creditModes = ['accrual', 'cash'] as const

export const creditModeSchema = z.enum(creditModes, {
  error: 'Accrual or cash.',
})

export type CreditMode = (typeof creditModes)[number]

export const transactionFilterSchema = transactionRangeSchema.extend({
  categoryId: z.number().int().positive().optional(),
  linkedAccountId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  statementId: z.number().int().positive().optional(),
  paymentStatementId: z.number().int().positive().optional(),
  creditMode: creditModeSchema.prefault('accrual'),
  lifecycle: entityStatusSchema.prefault('ACTIVE'),
})

export const searchTransactionsSchema = fetchArgsSchema.extend({
  filter: transactionFilterSchema.prefault({}),
})

export const exportTransactionsSchema =
  searchTransactionsSchema.extend(csvLocaleField)

export const CARD_PAYMENT_CATEGORY = {
  name: 'Credit card payment',
  color: '#64748B',
} as const

export const transferSchema = z
  .object({
    fromAccountId: z
      .number({ error: 'Pick the source account.' })
      .int()
      .positive('Pick the source account.'),
    toAccountId: z
      .number({ error: 'Pick the destination account.' })
      .int()
      .positive('Pick the destination account.'),
    categoryId: z
      .number({ error: 'Pick a category.' })
      .int()
      .positive('Pick a category.')
      .optional(),
    amount: amountSchema,
    transactionDt: transactionDtSchema,
    note: z
      .string()
      .max(2000, 'Keep the note under 2000 characters.')
      .nullish(),
    paymentStatementId: z
      .number({ error: 'Pick a bill.' })
      .int()
      .positive('Pick a bill.')
      .optional(),
    split: z
      .never({ error: 'Transfers and bill payments cannot be split.' })
      .optional(),
  })
  .superRefine((body, ctx) => {
    if (body.fromAccountId === body.toAccountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'Pick two different accounts.',
      })
    }
  })

export type CreateTransactionBody = z.infer<typeof createTransactionSchema>
export type UpdateTransactionBody = z.infer<typeof updateTransactionSchema>
export type InstallmentsBody = z.infer<typeof installmentsSchema>
export type UpdateInstallmentGroupBody = z.infer<
  typeof updateInstallmentGroupSchema
>
export type DeleteInstallmentGroupQuery = z.infer<
  typeof deleteInstallmentGroupSchema
>
export type RefundInstallmentGroupBody = z.infer<
  typeof refundInstallmentGroupSchema
>
export type ChangeTransactionStatusBody = z.infer<
  typeof changeTransactionStatusSchema
>
export type SearchTransactionsArgs = z.infer<typeof searchTransactionsSchema>
export type ExportTransactionsArgs = z.infer<typeof exportTransactionsSchema>
export type TransactionFilter = z.infer<typeof transactionFilterSchema>
export type TransferBody = z.infer<typeof transferSchema>

export type Transaction = {
  id: number
  name: string
  note: string | null
  invoice: string | null
  amount: string
  transactionDt: string
  balanceOnDt: string
  runningBalance: string
  isAdjustment: boolean
  locked: boolean
  linkedAccountId: number
  accountName: string
  currency: Currency
  categoryId: number
  categoryName: string
  categoryColor: string
  receiverId: number | null
  receiverName: string | null
  recurringId: number | null
  type: TransactionType
  status: TransactionStatus
  statusNote: string | null
  lifecycle: EntityStatus
  transferGroupId: string | null
  statementId: number | null
  statementPinned: boolean
  statementDueDate: string | null
  paymentStatementId: number | null
  paymentStatementDueDate: string | null
  installmentGroupId: string | null
  installmentNumber: number | null
  installmentCount: number | null
  paidByUserId: number | null
  paidByName: string | null
  isSettlement: boolean
  splits: TransactionSplitShare[]
  warning: StatementWarning | null
  createdDt: string
  updateDt: string
}

export type TransactionSplitShare = {
  userId: number
  userName: string
  share: string
}

export type InstallmentGroup = {
  groupId: string
  name: string
  note: string | null
  categoryId: number
  receiverId: number | null
  linkedAccountId: number
  currency: Currency
  transactionDt: string
  count: number
  total: string
  editable: boolean
  installments: Transaction[]
}

export type InstallmentRefund = {
  refund: Transaction | null
}

export const INSTALLMENTS_BILLED =
  "Some installments were already billed. Use 'Delete remaining' and create a new purchase for the rest."

export type TransactionSummaryGroup = {
  currency: Currency
  incomes: string
  expenses: string
  net: string
  creditExpenses: string
}

export type TransactionSummary = {
  groups: TransactionSummaryGroup[]
}

export const transactionBreakdownDimensions = ['category', 'account'] as const

export const transactionBreakdownDimensionSchema = z.enum(
  transactionBreakdownDimensions,
  { error: 'Pick a dimension.' }
)

export type TransactionBreakdownDimension =
  (typeof transactionBreakdownDimensions)[number]

export const transactionBreakdownSchema = transactionFilterSchema.extend({
  dimension: transactionBreakdownDimensionSchema,
})

export type TransactionBreakdownArgs = z.infer<
  typeof transactionBreakdownSchema
>

export type TransactionBreakdownItem = {
  name: string
  color: string | null
  total: string
}

export type TransactionBreakdownGroup = {
  currency: Currency
  items: TransactionBreakdownItem[]
}

export type TransactionBreakdown = {
  groups: TransactionBreakdownGroup[]
}

export const transactionHistoryActions = ['CREATE', 'UPDATE', 'DELETE'] as const

export type TransactionHistoryAction =
  (typeof transactionHistoryActions)[number]

export type TransactionHistoryEntry = {
  id: number
  transactionId: number
  action: TransactionHistoryAction
  before: unknown | null
  after: unknown | null
  createdBy: number | null
  createdDt: string
}
