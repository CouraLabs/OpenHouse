import { z } from "zod"
import {
  creditModes,
  installmentAmountModes,
  installmentDeleteScopes,
  INSTALLMENTS_BILLED,
  MAX_INSTALLMENTS,
  transactionBreakdownDimensions,
  transactionHistoryActions,
  transactionStatuses,
  transactionTypes,
  type BilledOnPreview,
  type CreditMode,
  type InstallmentAmountMode,
  type InstallmentDeleteScope,
  type InstallmentGroup,
  type InstallmentRefund,
  type InstallmentsPreview,
  type SearchTransactionsArgs,
  type Transaction,
  type TransactionBreakdown,
  type TransactionBreakdownArgs,
  type TransactionBreakdownDimension,
  type TransactionBreakdownGroup,
  type TransactionBreakdownItem,
  type TransactionFilter,
  type TransactionHistoryAction,
  type TransactionHistoryEntry,
  type TransactionSplitShare,
  type TransactionStatus,
  type TransactionSummary,
  type TransactionSummaryGroup,
  type TransactionType,
} from "@workspace/domain"
import { csvLocaleField } from "./csv-export.js"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"
import { dateOnlySchema } from "./goals.js"
import { amountSchema, positiveAmountSchema } from "./limits.js"
import { splitInputSchema, splitModes } from "./splits.js"

export {
  creditModes,
  installmentAmountModes,
  installmentDeleteScopes,
  INSTALLMENTS_BILLED,
  MAX_INSTALLMENTS,
  transactionBreakdownDimensions,
  transactionHistoryActions,
  transactionStatuses,
  transactionTypes,
  type BilledOnPreview,
  type CreditMode,
  type InstallmentAmountMode,
  type InstallmentDeleteScope,
  type InstallmentGroup,
  type InstallmentRefund,
  type InstallmentsPreview,
  type SearchTransactionsArgs,
  type Transaction,
  type TransactionBreakdown,
  type TransactionBreakdownArgs,
  type TransactionBreakdownDimension,
  type TransactionBreakdownGroup,
  type TransactionBreakdownItem,
  type TransactionFilter,
  type TransactionHistoryAction,
  type TransactionHistoryEntry,
  type TransactionSplitShare,
  type TransactionStatus,
  type TransactionSummary,
  type TransactionSummaryGroup,
  type TransactionType,
}

export const splitPreviewSchema = z.object({
  amount: z.string(),
  split: z.object({
    mode: z.enum(splitModes),
    entries: z.array(
      z.object({
        userId: z.number().int().positive(),
        value: z.string().optional(),
      })
    ),
  }),
  payerUserId: z.number().int().positive().nullish(),
})

export type SplitPreviewBody = z.infer<typeof splitPreviewSchema>

export const installmentsPreviewSchema = z.object({
  amount: amountSchema,
  count: z.number().int().min(1).max(MAX_INSTALLMENTS),
  amountMode: z.enum(installmentAmountModes).prefault("total"),
  cashPrice: z.string().optional(),
  availableLimit: z.string().nullish(),
})

export type InstallmentsPreviewBody = z.infer<typeof installmentsPreviewSchema>

export const billedOnPreviewSchema = z.object({
  closeDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  closeDayInclusive: z.boolean().prefault(false),
  transactionDt: dateOnlySchema,
})

export type BilledOnPreviewBody = z.infer<typeof billedOnPreviewSchema>

export const transactionTypeSchema = z.enum(transactionTypes, {
  error: "Income or expense.",
})

export const transactionStatusSchema = z.enum(transactionStatuses, {
  error: "Pick a status.",
})

export const transactionDtSchema = dateOnlySchema

export const transactionRangeSchema = z.object({
  transactionDtFrom: transactionDtSchema.optional(),
  transactionDtTo: transactionDtSchema.optional(),
})

export const installmentAmountModeSchema = z.enum(installmentAmountModes, {
  error: "Total or per installment.",
})

export const installmentsSchema = z.object({
  count: z
    .number({ error: "Enter how many installments." })
    .int("Enter a whole number of installments.")
    .min(1, "At least 1 installment.")
    .max(MAX_INSTALLMENTS, `At most ${MAX_INSTALLMENTS} installments.`),
  amountMode: installmentAmountModeSchema.prefault("total"),
})

export const createTransactionSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(255),
  note: z.string().max(2000, "Keep the note under 2000 characters.").nullish(),
  invoice: z
    .string()
    .max(255, "Keep the invoice under 255 characters.")
    .nullish(),
  amount: positiveAmountSchema,
  transactionDt: transactionDtSchema,
  linkedAccountId: z
    .number({ error: "Pick an account." })
    .int()
    .positive("Pick an account."),
  categoryId: z
    .number({ error: "Pick a category." })
    .int()
    .positive("Pick a category."),
  receiverId: z.number().int().positive().nullish(),
  type: transactionTypeSchema,
  status: transactionStatusSchema.prefault("Verify"),
  statusNote: z
    .string()
    .max(500, "Keep the note under 500 characters.")
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

export const installmentDeleteScopeSchema = z.enum(installmentDeleteScopes, {
  error: "All or remaining.",
})

export const deleteInstallmentGroupSchema = z.object({
  scope: installmentDeleteScopeSchema.prefault("all"),
})

export const refundInstallmentGroupSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(255),
})

export const changeTransactionStatusSchema = z.object({
  id: z.number().int().positive(),
  status: transactionStatusSchema,
  confirmReconciled: z.boolean().optional(),
})

export const deleteTransactionQuerySchema = z.object({
  confirmReconciled: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
})

export type DeleteTransactionQuery = z.infer<
  typeof deleteTransactionQuerySchema
>

export const creditModeSchema = z.enum(creditModes, {
  error: "Accrual or cash.",
})

export const transactionFilterSchema = transactionRangeSchema.extend({
  categoryId: z.number().int().positive().optional(),
  linkedAccountId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  statementId: z.number().int().positive().optional(),
  paymentStatementId: z.number().int().positive().optional(),
  creditMode: creditModeSchema.prefault("accrual"),
  lifecycle: entityStatusSchema.prefault("ACTIVE"),
})

export const searchTransactionsSchema = fetchArgsSchema.extend({
  filter: transactionFilterSchema.prefault({}),
})

export const exportTransactionsSchema =
  searchTransactionsSchema.extend(csvLocaleField)

export const transferSchema = z
  .object({
    fromAccountId: z
      .number({ error: "Pick the source account." })
      .int()
      .positive("Pick the source account."),
    toAccountId: z
      .number({ error: "Pick the destination account." })
      .int()
      .positive("Pick the destination account."),
    categoryId: z
      .number({ error: "Pick a category." })
      .int()
      .positive("Pick a category.")
      .optional(),
    amount: positiveAmountSchema,
    transactionDt: transactionDtSchema,
    note: z
      .string()
      .max(2000, "Keep the note under 2000 characters.")
      .nullish(),
    paymentStatementId: z
      .number({ error: "Pick a bill." })
      .int()
      .positive("Pick a bill.")
      .optional(),
    split: z
      .never({ error: "Transfers and bill payments cannot be split." })
      .optional(),
  })
  .superRefine((body, ctx) => {
    if (body.fromAccountId === body.toAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "Pick two different accounts.",
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
export type ExportTransactionsArgs = z.infer<typeof exportTransactionsSchema>
export type TransferBody = z.infer<typeof transferSchema>

export const transactionBreakdownDimensionSchema = z.enum(
  transactionBreakdownDimensions,
  { error: "Pick a dimension." }
)

export const transactionBreakdownSchema = transactionFilterSchema.extend({
  dimension: transactionBreakdownDimensionSchema,
})
