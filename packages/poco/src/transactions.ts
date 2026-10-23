import { z } from 'zod'

import type { StatementWarning } from './credit-card-statements.js'
import type { Currency } from './currencies.js'
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

/** The most installments a card purchase splits into. */
export const MAX_INSTALLMENTS = 48

/**
 * How the amount of an installment purchase reads: the purchase's `total`,
 * split by `splitInstallments` (the remainder cents on installment 1), or
 * the amount of each installment (`perInstallment` — an interest-bearing
 * plan, whose total is `count × amount`).
 */
export const installmentAmountModes = ['total', 'perInstallment'] as const

export const installmentAmountModeSchema = z.enum(installmentAmountModes, {
  error: 'Total or per installment.',
})

export type InstallmentAmountMode = (typeof installmentAmountModes)[number]

/** How a card purchase splits: into `count` installments, each on the next
 * bill. A count of 1 is a single charge. */
export const installmentsSchema = z.object({
  count: z
    .number({ error: 'Enter how many installments.' })
    .int('Enter a whole number of installments.')
    .min(1, 'At least 1 installment.')
    .max(MAX_INSTALLMENTS, `At most ${MAX_INSTALLMENTS} installments.`),
  amountMode: installmentAmountModeSchema.prefault('total'),
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
  /** Confirms an edit to a row on or before the account's
   * `reconciledThrough`; without it the API answers 409. */
  confirmReconciled: z.boolean().optional(),
  /** Splits a credit card expense into installments, one per bill; only a
   * card expense accepts it (409 otherwise). */
  installments: installmentsSchema.optional(),
})

/**
 * The body updating a transaction accepts: the same fields, plus which row
 * — never a split; a purchase's installments change through the group
 * routes. On an installment the row route edits this installment only:
 * its amount, category, and note, while its bill is Open.
 */
export const updateTransactionSchema = createTransactionSchema
  .omit({ installments: true })
  .extend({
    id: z.number().int().positive(),
  })

/**
 * The body a group edit of an installment purchase accepts. Name, note,
 * category, and receiver move no money and apply to every installment,
 * billed ones included. A new amount or count re-splits the purchase —
 * only while every installment is on an Open bill (409 otherwise).
 */
export const updateInstallmentGroupSchema = createTransactionSchema
  .pick({
    name: true,
    note: true,
    categoryId: true,
    receiverId: true,
    amount: true,
  })
  .extend({ installments: installmentsSchema })

/** Which installments a group delete removes: the whole purchase (only
 * while none is billed), or those still on an Open bill. */
export const installmentDeleteScopes = ['all', 'remaining'] as const

export const installmentDeleteScopeSchema = z.enum(installmentDeleteScopes, {
  error: 'All or remaining.',
})

export type InstallmentDeleteScope = (typeof installmentDeleteScopes)[number]

/** The query a group delete reads its scope from. */
export const deleteInstallmentGroupSchema = z.object({
  scope: installmentDeleteScopeSchema.prefault('all'),
})

/**
 * The body a full refund of an installment purchase accepts: the name of
 * the refund — an Income on the card's open bill for what was already
 * billed, the rest deleted.
 */
export const refundInstallmentGroupSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
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
  /** Confirms a change to a reconciled (locked) row. */
  confirmReconciled: z.boolean().optional(),
})

/** The query a transaction delete reads its confirmation from. */
export const deleteTransactionQuerySchema = z.object({
  confirmReconciled: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type DeleteTransactionQuery = z.infer<typeof deleteTransactionQuerySchema>

/**
 * How month views date a card charge: by the day it was made (accrual,
 * the default) or by the due date of the bill it lands on (cash) — when
 * the money actually leaves the paying account. Rows off a card always
 * keep their own day.
 */
export const creditModes = ['accrual', 'cash'] as const

export const creditModeSchema = z.enum(creditModes, {
  error: 'Accrual or cash.',
})

export type CreditMode = (typeof creditModes)[number]

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
  /** Only the charges on one card bill. */
  statementId: z.number().int().positive().optional(),
  /** Only the payments that settle one card bill. */
  paymentStatementId: z.number().int().positive().optional(),
  /** Which day the date window reads for card charges. */
  creditMode: creditModeSchema.prefault('accrual'),
  lifecycle: entityStatusSchema.prefault('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a filter. */
export const searchTransactionsSchema = fetchArgsSchema.extend({
  filter: transactionFilterSchema.prefault({}),
})

/**
 * The category a bill payment lands in when the transfer names none:
 * fetched, or created the first time a tenant needs it. Transfers stay out
 * of every report, so the category is informative only.
 */
export const CARD_PAYMENT_CATEGORY = {
  name: 'Credit card payment',
  color: '#64748B',
} as const

/**
 * The body the transfer route accepts: money moving between two accounts of
 * the tenant, which materializes as two transactions — an Expense on the
 * source and an Income on the destination.
 *
 * A transfer into a credit card is a bill payment. `paymentStatementId`
 * names the bill it settles — explicitly: a payment made inside the next
 * period still settles the bill picked. Without one the API settles the
 * card's `defaultPaymentStatement`. The category may be left out only on a
 * payment, which then lands in `CARD_PAYMENT_CATEGORY`.
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
  /** @deprecated Write-order snapshot, wrong after a backdated entry. Use
   * `runningBalance`. */
  balanceOnDt: string
  /** The linked account's balance right after this row in date order
   * (`transactionDt`, then id): the opening balance plus every earlier
   * applied delta, computed on read over the whole account. */
  runningBalance: string
  /** Whether the row is a reconciliation adjustment: it moves the balance
   * but is no income or expense, so reports leave it out. */
  isAdjustment: boolean
  /** Whether the row is on or before its account's `reconciledThrough` —
   * editing it asks for a confirmation. */
  locked: boolean
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
  /** The card bill the charge lands on, or nothing off a card (and on the
   * card side of a payment). */
  statementId: number | null
  /** Whether the user moved the charge to its bill by hand — a date edit
   * then no longer re-resolves it. */
  statementPinned: boolean
  /** The due date of the bill, joined. */
  statementDueDate: string | null
  /** The bill a payment settles — set only on the card side of a transfer
   * into a card. */
  paymentStatementId: number | null
  /** The due date of the bill the payment settles, joined. */
  paymentStatementDueDate: string | null
  /** The purchase an installment belongs to, or nothing for a single row.
   * The grid renders `installmentNumber/installmentCount` ("TV 3/10"). */
  installmentGroupId: string | null
  installmentNumber: number | null
  installmentCount: number | null
  /** Set on a write's answer when the charge landed on a bill already
   * closed, so the form can offer to move it to the open one. */
  warning: StatementWarning | null
  createdDt: string
  updateDt: string
}

/**
 * One installment purchase, as the group routes answer it: its shared
 * fields, the total its installments add up to, whether every one is still
 * on an Open bill (`editable` — the amount and the count can change, and
 * the whole group can be deleted or collapsed), and the ACTIVE
 * installments in order.
 */
export type InstallmentGroup = {
  groupId: string
  name: string
  note: string | null
  categoryId: number
  receiverId: number | null
  linkedAccountId: number
  currency: Currency
  /** The purchase day every installment keeps. */
  transactionDt: string
  count: number
  total: string
  editable: boolean
  installments: Transaction[]
}

/** What a full refund answers: the refund Income on the open bill, or
 * nothing when no installment was billed yet (the purchase is just gone). */
export type InstallmentRefund = {
  refund: Transaction | null
}

/** The 409 a money change or a full delete answers once an installment is
 * billed. */
export const INSTALLMENTS_BILLED =
  "Some installments were already billed. Use 'Delete remaining' and create a new purchase for the rest."

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
