import { z } from 'zod'

import { type Currency } from './currencies.js'
import { dateOnlySchema } from './goals.js'
import { amountSchema } from './limits.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

/**
 * The transaction routes' contract: the bodies the write routes accept, the
 * args the search and summary routes accept, the transfer body, and the
 * rows they answer with. The session of the caller names the tenant — no
 * body or query ever does.
 */

/**
 * The kinds of transaction. The database spelling lives in
 * `@workspace/db` (`transactionTypes`) — keep the two in step.
 */
export const transactionTypes = ['Income', 'Expense'] as const

export const transactionTypeSchema = z.enum(transactionTypes, {
  error: 'Income or expense.',
})

export type TransactionType = (typeof transactionTypes)[number]

/**
 * The states a transaction's review can be in. The database spelling lives
 * in `@workspace/db` (`transactionStatuses`) — keep the two in step.
 */
export const transactionStatuses = ['Verify', 'Canceled', 'Checked'] as const

export const transactionStatusSchema = z.enum(transactionStatuses, {
  error: 'Pick a status.',
})

export type TransactionStatus = (typeof transactionStatuses)[number]

/** The day a transaction happened, as `YYYY-MM-DD`. */
export const transactionDtSchema = dateOnlySchema

/**
 * The date window a search, summary, or transfer can narrow to. Both ends
 * are optional and inclusive.
 */
export const transactionRangeSchema = z.object({
  transactionDtFrom: transactionDtSchema.optional(),
  transactionDtTo: transactionDtSchema.optional(),
})

/** The body creating a transaction accepts. */
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
})

/** The body updating a transaction accepts: the same fields, plus which row. */
export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.number().int().positive(),
})

/**
 * The body the status route accepts: which row, and the review status it
 * moves to — nothing else. A review-status change never moves money, so the
 * route takes no fields a stale grid row could resend: the full PUT remains
 * the only writer of every other field, and of the status note.
 */
export const changeTransactionStatusSchema = z.object({
  id: z.number().int().positive(),
  status: transactionStatusSchema,
})

/**
 * What a transaction search filters on. The entity's own lifecycle status
 * is wired as `lifecycle` so it never collides with the transaction's
 * business `status`; without a lifecycle, only ACTIVE rows.
 */
export const transactionFilterSchema = transactionRangeSchema.extend({
  categoryId: z.number().int().positive().optional(),
  linkedAccountId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  lifecycle: entityStatusSchema.prefault('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a filter. */
export const searchTransactionsSchema = fetchArgsSchema.extend({
  filter: transactionFilterSchema.prefault({}),
})

/**
 * The body the transfer route accepts: money moving between two accounts of
 * the tenant, which materializes as two transactions — an Expense on the
 * source and an Income on the destination.
 */
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
      .positive('Pick a category.'),
    amount: amountSchema,
    transactionDt: transactionDtSchema,
    note: z
      .string()
      .max(2000, 'Keep the note under 2000 characters.')
      .nullish(),
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
export type ChangeTransactionStatusBody = z.infer<
  typeof changeTransactionStatusSchema
>
export type SearchTransactionsArgs = z.infer<typeof searchTransactionsSchema>
export type TransactionFilter = z.infer<typeof transactionFilterSchema>
export type TransferBody = z.infer<typeof transferSchema>

/**
 * What the transaction routes return: the wire shape, the day as
 * `YYYY-MM-DD` and instants as full ISO. The account, category, receiver,
 * and recurring names come joined on every read, so the UI never has to
 * resolve an id. `balanceOnDt` is the linked account's balance right after
 * the transaction applied — server-stamped, never sent. The `currency` is
 * the linked account's denomination, so the UI formats every amount in the
 * money it was written in and never sums two currencies together.
 */
export type Transaction = {
  id: number
  name: string
  note: string | null
  invoice: string | null
  amount: string
  transactionDt: string
  balanceOnDt: string
  linkedAccountId: number
  accountName: string
  /** The currency the linked account denominates its money in. */
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
  /** The entity lifecycle (ACTIVE/DELETED), distinct from the business status. */
  lifecycle: EntityStatus
  /** The id both sides of one transfer share, or nothing for a row that is
   * not a transfer side. The UI keeps the pair out of day totals — the two
   * sides together would count the same money twice. */
  transferGroupId: string | null
  createdDt: string
  updateDt: string
}

/**
 * One currency's slice of a summary: the totals of the transactions whose
 * linked account is denominated in the currency. Mixed-currency tenants
 * never sum across currencies — the UI renders one card row per group.
 */
export type TransactionSummaryGroup = {
  currency: Currency
  incomes: string
  expenses: string
  net: string
  creditExpenses: string
}

/** What the summary route returns. */
export type TransactionSummary = {
  groups: TransactionSummaryGroup[]
}

/**
 * The dimensions a breakdown totals over: which category an expense
 * belongs to, or which account it moved through. The pies of the
 * transaction screen render one or the other.
 */
export const transactionBreakdownDimensions = ['category', 'account'] as const

export const transactionBreakdownDimensionSchema = z.enum(
  transactionBreakdownDimensions,
  { error: 'Pick a dimension.' }
)

export type TransactionBreakdownDimension =
  (typeof transactionBreakdownDimensions)[number]

/**
 * The body the breakdown route accepts: the same filter a search accepts,
 * naming the dimension it groups by. The route always totals expenses —
 * the pies answer where the money went, not where it came from.
 */
export const transactionBreakdownSchema = transactionFilterSchema.extend({
  dimension: transactionBreakdownDimensionSchema,
})

export type TransactionBreakdownArgs = z.infer<
  typeof transactionBreakdownSchema
>

/** One slice of a breakdown: a category's or an account's expense total. */
export type TransactionBreakdownItem = {
  name: string
  /** The color the category carries, or nothing when the dimension is
   * accounts — the UI assigns the series colors there. */
  color: string | null
  total: string
}

/** One currency's slices of a breakdown — mixed-currency tenants never sum
 * across currencies, so a pie renders per group. */
export type TransactionBreakdownGroup = {
  currency: Currency
  items: TransactionBreakdownItem[]
}

/** What the breakdown route returns. */
export type TransactionBreakdown = {
  groups: TransactionBreakdownGroup[]
}

/** The actions a history entry records. The database spelling lives in
 * `@workspace/db` (`transactionHistoryActions`) — keep the two in step. */
export const transactionHistoryActions = ['CREATE', 'UPDATE', 'DELETE'] as const

export type TransactionHistoryAction =
  (typeof transactionHistoryActions)[number]

/**
 * One entry of a transaction's history: the full row snapshot before and
 * after the change, as JSON. Entries are never edited.
 */
export type TransactionHistoryEntry = {
  id: number
  transactionId: number
  action: TransactionHistoryAction
  before: unknown | null
  after: unknown | null
  createdBy: number | null
  createdDt: string
}
