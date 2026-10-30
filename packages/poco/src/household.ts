import { z } from 'zod'

import { currencySchema, type Currency } from './currencies.js'
import { amountSchema } from './limits.js'
import { dateOnlySchema } from './goals.js'
import { formatCents, toCents } from './money.js'
import type { SplitShare } from './splits.js'

export const unsplitModes = ['personal', 'household'] as const

export const unsplitModeSchema = z.enum(unsplitModes, {
  error: 'Personal or household.',
})

export type UnsplitMode = (typeof unsplitModes)[number]

export const accountOwnerships = ['personal', 'shared'] as const

export const accountOwnershipSchema = z.enum(accountOwnerships, {
  error: 'Personal or shared.',
})

export type AccountOwnership = (typeof accountOwnerships)[number]

export type LedgerEntry = {
  payerUserId: number | null
  currency: Currency
  amount: string
  shares: readonly SplitShare[]
}

export type MemberBalance = {
  userId: number
  currency: Currency
  balance: string
}

export function memberBalances(
  entries: readonly LedgerEntry[]
): MemberBalance[] {
  const byCurrency = new Map<Currency, Map<number, bigint>>()

  for (const entry of entries) {
    if (entry.payerUserId === null || entry.shares.length === 0) {
      continue
    }

    const members = byCurrency.get(entry.currency) ?? new Map<number, bigint>()

    byCurrency.set(entry.currency, members)

    const credit = (userId: number, cents: bigint) =>
      members.set(userId, (members.get(userId) ?? 0n) + cents)

    credit(entry.payerUserId, toCents(entry.amount))

    for (const share of entry.shares) {
      credit(share.userId, -toCents(share.share))
    }
  }

  return [...byCurrency]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([currency, members]) =>
      [...members]
        .sort(([a], [b]) => a - b)
        .map(([userId, cents]) => ({
          userId,
          currency,
          balance: formatCents(cents),
        }))
    )
}

export type DebtTransfer = {
  currency: Currency
  fromUserId: number
  toUserId: number
  amount: string
}

export function simplifyDebts(
  balances: readonly MemberBalance[]
): DebtTransfer[] {
  const currencies = [
    ...new Set(balances.map((entry) => entry.currency)),
  ].sort()
  const transfers: DebtTransfer[] = []

  for (const currency of currencies) {
    const owed: Array<{ userId: number; cents: bigint }> = []
    const owing: Array<{ userId: number; cents: bigint }> = []

    for (const entry of balances) {
      if (entry.currency !== currency) {
        continue
      }

      const cents = toCents(entry.balance)

      if (cents > 0n) {
        owed.push({ userId: entry.userId, cents })
      } else if (cents < 0n) {
        owing.push({ userId: entry.userId, cents: -cents })
      }
    }

    const pay = (
      debtor: { userId: number; cents: bigint },
      creditor: { userId: number; cents: bigint },
      cents: bigint
    ) => {
      transfers.push({
        currency,
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: formatCents(cents),
      })
      debtor.cents -= cents
      creditor.cents -= cents
    }

    for (const debtor of owing) {
      const match = owed.find(
        (creditor) => creditor.cents > 0n && creditor.cents === debtor.cents
      )

      if (match !== undefined) {
        pay(debtor, match, debtor.cents)
      }
    }

    const byLargest = (
      a: { userId: number; cents: bigint },
      b: { userId: number; cents: bigint }
    ) =>
      a.cents === b.cents ? a.userId - b.userId : a.cents > b.cents ? -1 : 1

    for (;;) {
      const debtor = owing
        .filter((entry) => entry.cents > 0n)
        .sort(byLargest)[0]
      const creditor = owed
        .filter((entry) => entry.cents > 0n)
        .sort(byLargest)[0]

      if (debtor === undefined || creditor === undefined) {
        break
      }

      pay(
        debtor,
        creditor,
        debtor.cents < creditor.cents ? debtor.cents : creditor.cents
      )
    }
  }

  return transfers
}

export type HouseholdMember = {
  id: number
  name: string
  isActive: boolean
}

export type HouseholdBalance = {
  userId: number
  userName: string
  isActive: boolean
  currency: Currency
  balance: string
}

export type SettleSuggestion = {
  currency: Currency
  fromUserId: number
  fromName: string
  toUserId: number
  toName: string
  amount: string
}

export type MemberSpending = {
  userId: number
  userName: string
  currency: Currency
  total: string
}

export type CategorySpending = {
  categoryId: number
  categoryName: string
  categoryColor: string
  currency: Currency
  total: string
}

export type SettlementEntry = {
  id: number
  transactionDt: string
  currency: Currency
  amount: string
  fromUserId: number
  fromName: string
  toUserId: number
  toName: string
  note: string | null
}

export const householdOverviewSchema = z.object({
  transactionDtFrom: dateOnlySchema.optional(),
  transactionDtTo: dateOnlySchema.optional(),
})

export type HouseholdOverviewArgs = z.infer<typeof householdOverviewSchema>

export type HouseholdOverview = {
  members: HouseholdMember[]
  unsplitMode: UnsplitMode
  balances: HouseholdBalance[]
  suggestions: SettleSuggestion[]
  byMember: MemberSpending[]
  byCategory: CategorySpending[]
  settlements: SettlementEntry[]
}

export type MemberBalanceCheck = {
  userId: number
  userName: string
  lines: Array<{ currency: Currency; balance: string }>
}

export const settleUpSchema = z
  .object({
    fromUserId: z.number({ error: 'Pick who pays.' }).int().positive(),
    toUserId: z.number({ error: 'Pick who receives.' }).int().positive(),
    amount: amountSchema,
    currency: currencySchema,
    fromAccountId: z
      .number({ error: 'Pick the paying account.' })
      .int()
      .positive('Pick the paying account.'),
    toAccountId: z.number().int().positive().nullish(),
    transactionDt: dateOnlySchema,
    note: z
      .string()
      .max(2000, 'Keep the note under 2000 characters.')
      .nullish(),
  })
  .superRefine((body, ctx) => {
    if (body.fromUserId === body.toUserId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toUserId'],
        message: 'Pick two different members.',
      })
    }

    if (toCents(body.amount) <= 0n) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Enter an amount above zero.',
      })
    }
  })

export type SettleUpBody = z.infer<typeof settleUpSchema>

export const SETTLEMENT_CATEGORY = {
  name: 'Settlement',
  color: '#0F766E',
} as const
