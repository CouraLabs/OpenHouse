import { z } from 'zod'

import { currencySchema, type Currency } from './currencies.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'
import { amountSchema } from './limits.js'

/**
 * The account routes' contract: the bodies the write routes accept, the args
 * the search route accepts, and the rows they answer with. The session of
 * the caller names the tenant — no body or query ever does.
 */

/** The kinds of account a tenant keeps. */
export const accountTypes = ['Checking', 'Credit', 'Savings'] as const

export const accountTypeSchema = z.enum(accountTypes, {
  error: 'Pick a type.',
})

export type AccountType = (typeof accountTypes)[number]

/**
 * The balance an account body accepts: the same shape as an amount, but a
 * Credit card's balance runs negative, so a leading minus is allowed.
 */
export const balanceSchema = z
  .string()
  .regex(/^-?\d{1,14}(\.\d{1,2})?$/, 'Enter an amount like 12.34.')

/**
 * The body creating an account accepts. Which fields a type needs is a
 * business rule, not a shape: the refinement below makes the agency
 * required for Checking and Savings, and the limit and the close/due
 * month-day pairs required for Credit — and forbids the credit-only fields
 * everywhere else. A close or due date carries no year, so it stores a
 * month-day pair. The `number` is bounded to what the `integer` column
 * stores — anything larger would 500 at insert instead of rejecting here.
 */
export const createAccountSchema = z
  .object({
    name: z.string().min(1, 'Enter a name.').max(255),
    agency: z.string().max(255).nullish(),
    number: z
      .number({ error: 'Enter an account number.' })
      .int('Enter a whole number.')
      .positive('Enter an account number.')
      .max(2_147_483_647, 'Keep the number under 2147483647.'),
    type: accountTypeSchema,
    balance: balanceSchema,
    /** The currency the account's money is denominated in. */
    currency: currencySchema,
    limit: amountSchema.nullish(),
    closeDay: z.number().int().min(1).max(31).nullish(),
    closeMonth: z.number().int().min(1).max(12).nullish(),
    dueDay: z.number().int().min(1).max(31).nullish(),
    dueMonth: z.number().int().min(1).max(12).nullish(),
  })
  .superRefine((account, ctx) => {
    if (account.type === 'Checking' || account.type === 'Savings') {
      if (
        account.agency === undefined ||
        account.agency === null ||
        account.agency === ''
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['agency'],
          message: 'Enter the agency.',
        })
      }
    }
    if (account.type === 'Credit') {
      if (account.limit === undefined || account.limit === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['limit'],
          message: 'Enter the limit.',
        })
      }
      if (
        account.closeDay === undefined ||
        account.closeDay === null ||
        account.closeMonth === undefined ||
        account.closeMonth === null
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['closeDay'],
          message: 'Pick the close date.',
        })
      }
      if (
        account.dueDay === undefined ||
        account.dueDay === null ||
        account.dueMonth === undefined ||
        account.dueMonth === null
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['dueDay'],
          message: 'Pick the due date.',
        })
      }
    } else {
      // Credit-only fields must be empty on the other types.
      for (const field of [
        'limit',
        'closeDay',
        'closeMonth',
        'dueDay',
        'dueMonth',
      ] as const) {
        if (account[field] !== undefined && account[field] !== null) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: 'Only a Credit account has this.',
          })
        }
      }
    }
    // A day must exist in its month (leap-aware, year pinned to 2000).
    for (const [dayKey, monthKey] of [
      ['closeDay', 'closeMonth'],
      ['dueDay', 'dueMonth'],
    ] as const) {
      const day = account[dayKey]
      const month = account[monthKey]
      if (
        day !== undefined &&
        day !== null &&
        month !== undefined &&
        month !== null &&
        day > new Date(2000, month, 0).getDate()
      ) {
        ctx.addIssue({
          code: 'custom',
          path: [dayKey],
          message: 'That day does not exist in the month.',
        })
      }
    }
  })

/** The body updating an account accepts: the same fields, plus which row. */
export const updateAccountSchema = createAccountSchema.extend({
  id: z.number().int().positive(),
})

/** What an account search filters on. Without a status, only ACTIVE rows. */
export const accountFilterSchema = z.object({
  type: accountTypeSchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with an account filter. */
export const searchAccountsSchema = fetchArgsSchema.extend({
  filter: accountFilterSchema.prefault({}),
})

export type CreateAccountBody = z.infer<typeof createAccountSchema>
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>
export type SearchAccountsArgs = z.infer<typeof searchAccountsSchema>

/** The lightweight shape pickers read — what `GET /accounts` returns. The
 * `type` rides along so a picker can offer only the kinds it means — the
 * goals form, for one, offers only Savings. */
export type AccountRef = {
  id: number
  name: string
  type: AccountType
  /** The currency the account's money is denominated in — a picker
   * matching two accounts for a transfer reads it here. */
  currency: Currency
}

/**
 * What the account routes return: the wire shape, dates as ISO strings.
 * The close and due dates are month-day pairs without a year.
 */
export type Account = {
  id: number
  name: string
  agency: string | null
  number: number
  type: AccountType
  balance: string
  currency: Currency
  limit: string | null
  closeDay: number | null
  closeMonth: number | null
  dueDay: number | null
  dueMonth: number | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
