import { eq, sql } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { accounts } from '@workspace/db'
import type { TransactionType } from '@workspace/poco'

/**
 * The transaction type of the database handle a write runs on: either the
 * plain injected database or a transaction it opened. Both expose the same
 * query builder, so every ledger helper accepts either.
 */
export type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Adds two decimal money strings exactly, on cents — money never travels
 * through a float. Both amounts carry at most two decimals, the shape the
 * `numeric(16,2)` columns store, and may be negative (a credit card's
 * balance runs negative).
 */
export function addMoney(a: string, b: string): string {
  return formatCents(toCents(a) + toCents(b))
}

/**
 * Negates a decimal money string, for reverting a delta.
 */
export function negateMoney(a: string): string {
  return formatCents(-toCents(a))
}

/** The delta a transaction applies to its account: income adds, expense
 * subtracts. A credit card's expense subtracts like any other — spending
 * reduces what is available the same way. */
export function deltaFor(type: TransactionType, amount: string): string {
  return type === 'Income' ? amount : negateMoney(amount)
}

/**
 * Applies a transaction's delta to an account's balance and answers the
 * new balance — the value `balanceOnDt` carries.
 *
 * The account row is read `FOR UPDATE` inside the caller's transaction, so
 * two concurrent writes to one account serialize instead of both computing
 * from the same starting balance. The caller must already have validated
 * that the account belongs to the tenant.
 *
 * @returns the account's balance after the delta applied.
 */
export async function applyTransactionDelta(
  tx: DbOrTx,
  tenantId: number,
  accountId: number,
  delta: string
): Promise<string> {
  const [account] = await tx
    .select({ balance: accounts.balance })
    .from(accounts)
    .where(sql`${eq(accounts.id, accountId)} and ${eq(accounts.tenantId, tenantId)} for update`)

  if (account === undefined) {
    throw new Error(`No account with id ${accountId} in tenant ${tenantId}.`)
  }

  const newBalance = addMoney(account.balance, delta)

  await tx
    .update(accounts)
    .set({ balance: newBalance })
    .where(eq(accounts.id, accountId))

  return newBalance
}

/** Reads a decimal money string into BigInt cents. */
function toCents(value: string): bigint {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(value)

  if (match === null) {
    throw new Error(`"${value}" is not a decimal money string.`)
  }

  const [, sign, whole, fraction = ''] = match
  const cents = BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))

  return sign === undefined ? cents : -cents
}

/** Formats BigInt cents back into the two-decimal string the columns store. */
function formatCents(cents: bigint): string {
  const sign = cents < 0n ? '-' : ''
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${sign}${whole}.${fraction}`
}
