import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import type { Currency } from './currencies.js'
import { amountSchema } from './limits.js'
import { splitInputSchema, type SplitInput } from './splits.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'
import { transactionTypeSchema, type TransactionType } from './transactions.js'

export const frequencies = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export const frequencySchema = z.enum(frequencies, {
  error: 'Pick a frequency.',
})

export type Frequency = (typeof frequencies)[number]

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
    type: transactionTypeSchema,
    frequency: frequencySchema,
    frequencyDay: z
      .number()
      .int()
      .min(1, 'The day must be 1 or more.')
      .max(31, 'The day must be 31 or less.')
      .nullish(),
    frequencyMonth: z
      .number()
      .int()
      .min(1, 'The month must be 1 or more.')
      .max(12, 'The month must be 12 or less.')
      .nullish(),
    paidByUserId: z.number().int().positive().nullish(),
    defaultSplit: splitInputSchema.nullish(),
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

export const updateRecurringTransactionSchema =
  createRecurringTransactionSchema.extend({
    id: z.number().int().positive(),
  })

export const recurringTransactionFilterSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  linkedAccountId: z.number().int().positive().optional(),
  frequency: frequencySchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

export const searchRecurringTransactionsSchema = fetchArgsSchema.extend({
  filter: recurringTransactionFilterSchema.prefault({}),
})

export const exportRecurringTransactionsSchema =
  searchRecurringTransactionsSchema.extend(csvLocaleField)

export type CreateRecurringTransactionBody = z.infer<
  typeof createRecurringTransactionSchema
>
export type UpdateRecurringTransactionBody = z.infer<
  typeof updateRecurringTransactionSchema
>
export type SearchRecurringTransactionsArgs = z.infer<
  typeof searchRecurringTransactionsSchema
>
export type ExportRecurringTransactionsArgs = z.infer<
  typeof exportRecurringTransactionsSchema
>

export type RecurringTransaction = {
  id: number
  receiverId: number
  receiverName: string
  categoryId: number
  categoryName: string
  linkedAccountId: number
  accountName: string
  accountCurrency: Currency
  amount: string
  type: TransactionType
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
  paidByUserId: number | null
  paidByName: string | null
  defaultSplit: SplitInput | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
