import { z } from 'zod'

import { currencySchema, type Currency } from './currencies.js'
import { amountSchema } from './limits.js'
import { dateOnlySchema } from './goals.js'
import { formatCents, toCents } from './money.js'
import type { SplitShare } from './splits.js'

/**
 * The household routes' contract: who owes whom, the settle-up that clears
 * it, and the pure math behind both. Balances are derived on read from the
 * transactions and their splits — never stored, so they cannot drift.
 */

/** How an expense with no split reads. The database spelling lives in
 * `@workspace/db` (`unsplitModes`) — keep the two in step. */
export const unsplitModes = ['personal', 'household'] as const

export const unsplitModeSchema = z.enum(unsplitModes, {
  error: 'Personal or household.',
})

export type UnsplitMode = (typeof unsplitModes)[number]

/** Who an account belongs to. The database spelling lives in
 * `@workspace/db` (`accountOwnerships`) — keep the two in step. */
export const accountOwnerships = ['personal', 'shared'] as const

export const accountOwnershipSchema = z.enum(accountOwnerships, {
  error: 'Personal or shared.',
})

export type AccountOwnership = (typeof accountOwnerships)[number]

/**
 * One expense as the balance math sees it: who paid, in which currency, how
 * much, and how it is shared. An entry with no payer or no shares moves no
 * debt.
 */
export type LedgerEntry = {
  payerUserId: number | null
  currency: Currency
  amount: string
  shares: readonly SplitShare[]
}

/** A member's balance in one currency: positive is owed to them, negative
 * is what they owe. */
export type MemberBalance = {
  userId: number
  currency: Currency
  balance: string
}

/**
 * The balance of every member per currency: `paid by me for others − paid
 * by others for me`. The payer is credited the whole amount and everyone is
 * debited their share, so a payer's own share cancels and the balances of a
 * currency always add up to zero. Currencies never mix. Ordered by currency,
 * then member id.
 */
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

/** One payment that moves a debt from a member to another. */
export type DebtTransfer = {
  currency: Currency
  fromUserId: number
  toUserId: number
  amount: string
}

/**
 * Reduces the debts to few transfers, per currency ("Ana pays Bruno R$
 * 120"). Opposite balances of equal size cancel in one transfer first; the
 * rest is matched largest debtor to largest creditor, so n members need at
 * most n − 1 transfers. Applying every transfer zeroes every balance.
 * Deterministic: ties break by member id.
 */
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

    // A debtor and a creditor of the same size clear each other in one go.
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

/** A member of the household, as the pickers and the page list them. */
export type HouseholdMember = {
  id: number
  name: string
  /** False once an owner removed the member; their balance stays. */
  isActive: boolean
}

/** A member's balance in one currency, with the name joined. */
export type HouseholdBalance = {
  userId: number
  userName: string
  isActive: boolean
  currency: Currency
  balance: string
}

/** A settle-up the page suggests: one payment that moves a debt. */
export type SettleSuggestion = {
  currency: Currency
  fromUserId: number
  fromName: string
  toUserId: number
  toName: string
  amount: string
}

/** What the members bore in one currency: their shares of the expenses. */
export type MemberSpending = {
  userId: number
  userName: string
  currency: Currency
  total: string
}

/** What one category cost in one currency, split by who bore it. */
export type CategorySpending = {
  categoryId: number
  categoryName: string
  categoryColor: string
  currency: Currency
  total: string
}

/** One recorded settle-up, as the history lists it. */
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

/** The args the overview takes: the window the spending covers. Balances
 * always cover everything. */
export const householdOverviewSchema = z.object({
  transactionDtFrom: dateOnlySchema.optional(),
  transactionDtTo: dateOnlySchema.optional(),
})

export type HouseholdOverviewArgs = z.infer<typeof householdOverviewSchema>

/** What the Household page reads. */
export type HouseholdOverview = {
  members: HouseholdMember[]
  unsplitMode: UnsplitMode
  balances: HouseholdBalance[]
  suggestions: SettleSuggestion[]
  byMember: MemberSpending[]
  byCategory: CategorySpending[]
  settlements: SettlementEntry[]
}

/** What the member removal check answers: the balances the member still
 * holds, one line per currency — empty when the member is square. */
export type MemberBalanceCheck = {
  userId: number
  userName: string
  lines: Array<{ currency: Currency; balance: string }>
}

/**
 * The body a settle-up accepts: `fromUserId` pays `toUserId`. With both
 * accounts it is a transfer between them (same currency); with only the
 * paying account — the receiver's is not one the payer can use — it is an
 * Expense on the paying account with the receiving member as receiver. Both
 * are flagged as settlements and stay out of income and expense reports.
 */
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

/**
 * The category a settle-up lands in when the body names none: fetched, or
 * created the first time a tenant needs it. Settlements stay out of every
 * report, so the category is informative only.
 */
export const SETTLEMENT_CATEGORY = {
  name: 'Settlement',
  color: '#0F766E',
} as const
