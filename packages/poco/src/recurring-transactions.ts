import { z } from 'zod'

import { amountSchema } from './limits.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'
import {
  transactionTypeSchema,
  type TransactionType,
} from './transactions.js'

/**
 * The recurring-transaction routes' contract: the bodies the write routes
 * accept, the args the search route accepts, and the rows they answer with.
 * The session of the caller names the tenant — no body or query ever does.
 */

/**
 * The frequencies a recurring rule can repeat with. The database spelling
 * lives in `@workspace/db` (`frequencies`) — keep the two in step. A form
 * picking a frequency with nothing chosen gets the friendly message, not a
 * type error.
 */
export const frequencies = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export const frequencySchema = z.enum(frequencies, {
  error: 'Pick a frequency.',
})

export type Frequency = (typeof frequencies)[number]

/** The body creating a recurring rule accepts. */
export const createRecurringTransactionSchema = z
  .object({
    receiverId: z
      .number({ error: 'Pick a receiver.' })
      .int()
      .positive('Pick a receiver.'),
    categoryId: z
      .number({ error: 'Pick a category.' })
      .int()
      .positive('Pick a category.'),
    linkedAccountId: z
      .number({ error: 'Pick an account.' })
      .int()
      .positive('Pick an account.'),
    amount: amountSchema,
    /** Whether the rule generates an Income or an Expense transaction. */
    type: transactionTypeSchema,
    frequency: frequencySchema,
    /** Weekly: weekday 1–7; Monthly/Yearly: day 1–31; Daily: nothing. */
    frequencyDay: z
      .number()
      .int()
      .min(1, 'The day must be 1 or more.')
      .max(31, 'The day must be 31 or less.')
      .nullish(),
    /** Yearly only: month 1–12. */
    frequencyMonth: z
      .number()
      .int()
      .min(1, 'The month must be 1 or more.')
      .max(12, 'The month must be 12 or less.')
      .nullish(),
  })
  .superRefine((rule, ctx) => {
    const { frequency, frequencyDay, frequencyMonth } = rule

    if (frequency === 'Daily') {
      if (frequencyDay != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['frequencyDay'],
          message: 'A Daily rule has no day.',
        })
      }

      if (frequencyMonth != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['frequencyMonth'],
          message: 'A Daily rule has no month.',
        })
      }

      return
    }

    if (frequency === 'Weekly') {
      if (frequencyDay == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['frequencyDay'],
          message: 'Pick the day of the week.',
        })
      } else if (frequencyDay < 1 || frequencyDay > 7) {
        ctx.addIssue({
          code: 'custom',
          path: ['frequencyDay'],
          message: 'The day of the week runs 1 to 7.',
        })
      }

      if (frequencyMonth != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['frequencyMonth'],
          message: 'A Weekly rule has no month.',
        })
      }

      return
    }

    if (frequencyDay == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['frequencyDay'],
        message: 'Pick the day of the month.',
      })
    }

    if (frequency === 'Yearly' && frequencyMonth == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['frequencyMonth'],
        message: 'Pick the day and the month.',
      })
    }
  })

/** The body updating a recurring rule accepts: the same fields, plus which
 * row. */
export const updateRecurringTransactionSchema =
  createRecurringTransactionSchema.extend({
    id: z.number().int().positive(),
  })

/** What a recurring search filters on. Without a status, only ACTIVE rows. */
export const recurringTransactionFilterSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  linkedAccountId: z.number().int().positive().optional(),
  frequency: frequencySchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a rule filter. */
export const searchRecurringTransactionsSchema = fetchArgsSchema.extend({
  filter: recurringTransactionFilterSchema.prefault({}),
})

export type CreateRecurringTransactionBody = z.infer<
  typeof createRecurringTransactionSchema
>
export type UpdateRecurringTransactionBody = z.infer<
  typeof updateRecurringTransactionSchema
>
export type SearchRecurringTransactionsArgs = z.infer<
  typeof searchRecurringTransactionsSchema
>

/**
 * What the recurring routes return: the wire shape, dates as ISO strings.
 * The receiver, category, and account names come joined on every read, so
 * the UI never has to resolve an id.
 */
export type RecurringTransaction = {
  id: number
  receiverId: number
  receiverName: string
  categoryId: number
  categoryName: string
  linkedAccountId: number
  accountName: string
  amount: string
  type: TransactionType
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
