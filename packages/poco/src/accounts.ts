import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'
import { cycleDaysDiffer } from './credit-card-cycle.js'

import { currencySchema, type Currency } from './currencies.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'
import { dateOnlySchema } from './goals.js'
import { amountSchema } from './limits.js'
import { addMoney } from './money.js'
import { accountOwnershipSchema, type AccountOwnership } from './household.js'

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

export const balanceSchema = z
  .string()
  .regex(/^-?\d{1,14}(\.\d{1,2})?$/, 'Enter an amount like 12.34.')

export const spreadPctSchema = z
  .string()
  .regex(/^\d{1,3}(\.\d{1,2})?$/, 'Enter a percentage like 4.00.')
  .refine((value) => Number(value) <= 100, 'Keep the spread at 100% or less.')

export const SPREAD_WARNING_PCT = 20

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
    balance: balanceSchema.nullish(),
    openingDt: dateOnlySchema.optional(),
    currency: currencySchema,
    spreadPct: spreadPctSchema.prefault('0'),
    limit: amountSchema.nullish(),
    closeDay: z.number().int().min(1).max(31).nullish(),
    dueDay: z.number().int().min(1).max(31).nullish(),
    closeDayInclusive: z.boolean().prefault(false),
    isDefault: z.boolean().prefault(false),
    ownership: accountOwnershipSchema.prefault('personal'),
  })
  .superRefine((account, ctx) => {
    if (
      account.type !== 'Credit Card' &&
      (account.balance === undefined || account.balance === null)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['balance'],
        message: 'Enter an amount like 12.34.',
      })
    }
    if (
      account.closeDay != null &&
      account.dueDay != null &&
      !cycleDaysDiffer(account.closeDay, account.dueDay)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDay'],
        message: 'The close and due days must differ.',
      })
    }
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
      if (account.closeDayInclusive) {
        ctx.addIssue({
          code: 'custom',
          path: ['closeDayInclusive'],
          message: 'Only a Credit Card has this.',
        })
      }
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

export const updateAccountSchema = createAccountSchema.extend({
  id: z.number().int().positive(),
})

export const accountFilterSchema = z.object({
  type: accountTypeSchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

export const searchAccountsSchema = fetchArgsSchema.extend({
  filter: accountFilterSchema.prefault({}),
})

export const exportAccountsSchema = searchAccountsSchema.extend(csvLocaleField)

export type CreateAccountBody = z.infer<typeof createAccountSchema>
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>
export type SearchAccountsArgs = z.infer<typeof searchAccountsSchema>
export type ExportAccountsArgs = z.infer<typeof exportAccountsSchema>

export type AccountRef = {
  id: number
  name: string
  type: AccountType
  currency: Currency
  isDefault: boolean
  ownership: AccountOwnership
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  availableLimit: string | null
}

export function availableLimit(account: {
  type: AccountType
  limit: string | null
  balance: string
}): string | null {
  if (account.type !== 'Credit Card' || account.limit === null) {
    return null
  }

  return addMoney(account.limit, account.balance)
}

export type Account = {
  id: number
  name: string
  agency: string | null
  number: string | null
  type: AccountType
  balance: string
  openingBalance: string
  openingDt: string
  reconciledThrough: string | null
  currency: Currency
  spreadPct: string
  limit: string | null
  availableLimit: string | null
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  isDefault: boolean
  ownership: AccountOwnership
  status: EntityStatus
  createdDt: string
  updateDt: string
}

export const deleteAccountQuerySchema = z.object({
  confirmUnpaidBills: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type DeleteAccountQuery = z.infer<typeof deleteAccountQuerySchema>

export interface AccountDeleteConflict {
  message: string
  unpaidBills: number
  amountDue: string
  currency: Currency
}
