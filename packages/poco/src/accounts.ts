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
export const accountTypes = [
  'Checking',
  'Wallet',
  'Savings',
  'Credit Card',
] as const

export const accountTypeSchema = z.enum(accountTypes, {
  error: 'Pick a type.',
})

export type AccountType = (typeof accountTypes)[number]

/**
 * The balance an account body accepts: the same shape as an amount, but a
 * credit card's balance runs negative, so a leading minus is allowed.
 */
export const balanceSchema = z
  .string()
  .regex(/^-?\d{1,14}(\.\d{1,2})?$/, 'Enter an amount like 12.34.')

/**
 * The body creating an account accepts. Which fields a type needs is a
 * business rule, not a shape: the refinement below makes the agency and the
 * number required for Checking and Savings, the limit and the close/due days
 * required for a Credit Card — and forbids the card-only fields everywhere
 * else, and the agency and the number on the account kinds that have no bank
 * behind them. A close or due date is a day of the month alone — a card
 * closes on the 15th, whatever the month — so no month rides along. The
 * `number` is an identifier, not a quantity: kept as typed — leading zeros,
 * a check digit after a hyphen — and bounded to the `varchar(34)` column,
 * wide enough for an IBAN.
 */
export const createAccountSchema = z
  .object({
    name: z.string().min(1, 'Enter a name.').max(255),
    agency: z.string().max(255).nullish(),
    number: z
      .string()
      .trim()
      .min(1, 'Enter an account number.')
      .max(34, 'Keep the number to 34 characters.')
      .regex(
        /^[0-9A-Za-z\- ]+$/,
        'Use only letters, digits, hyphens, and spaces.'
      )
      .nullish(),
    type: accountTypeSchema,
    balance: balanceSchema,
    /** The currency the account's money is denominated in. */
    currency: currencySchema,
    limit: amountSchema.nullish(),
    closeDay: z.number().int().min(1).max(31).nullish(),
    dueDay: z.number().int().min(1).max(31).nullish(),
    /** Whether the account is the tenant's default — the one new
     * transactions start in. Only one account carries the flag; the API
     * clears the previous holder. */
    isDefault: z.boolean().prefault(false),
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
      if (account.number === undefined || account.number === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['number'],
          message: 'Enter the account number.',
        })
      }
    }
    if (account.type === 'Wallet' || account.type === 'Credit Card') {
      // Neither a wallet nor a card sits at a bank branch.
      if (
        account.agency !== undefined &&
        account.agency !== null &&
        account.agency !== ''
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['agency'],
          message: 'Only a bank account has an agency.',
        })
      }
      // …and neither carries a bank account number.
      if (account.number !== undefined && account.number !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['number'],
          message: 'Only a bank account has a number.',
        })
      }
    }
    if (account.type === 'Credit Card') {
      if (account.limit === undefined || account.limit === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['limit'],
          message: 'Enter the limit.',
        })
      }
      if (account.closeDay === undefined || account.closeDay === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['closeDay'],
          message: 'Pick the close date.',
        })
      }
      if (account.dueDay === undefined || account.dueDay === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['dueDay'],
          message: 'Pick the due date.',
        })
      }
    } else {
      // Card-only fields must be empty on the other types.
      for (const field of ['limit', 'closeDay', 'dueDay'] as const) {
        if (account[field] !== undefined && account[field] !== null) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: 'Only a Credit Card has this.',
          })
        }
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
  /** Whether the account is the tenant's default — the one a new
   * transaction starts in. */
  isDefault: boolean
}

/**
 * What the account routes return: the wire shape, dates as ISO strings.
 * The close and due dates are days of the month, without a month or year.
 */
export type Account = {
  id: number
  name: string
  agency: string | null
  number: string | null
  type: AccountType
  balance: string
  currency: Currency
  limit: string | null
  closeDay: number | null
  dueDay: number | null
  isDefault: boolean
  status: EntityStatus
  createdDt: string
  updateDt: string
}
