import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { DbOrTx } from '@workspace/db'
import { accounts } from '@workspace/db'
import type { TransactionStatus, TransactionType } from '@workspace/poco'
import { addMoney, negateMoney } from '@workspace/poco'

import { LedgerConflictError } from '../common/ledger/ledger-conflict.js'

/** The delta a transaction applies to its account: income adds, expense
 * subtracts. A credit card's expense subtracts like any other — spending
 * reduces what is available the same way. */
export function deltaFor(type: TransactionType, amount: string): string {
  return type === 'Income' ? amount : negateMoney(amount)
}

/**
 * The delta a transaction has applied to its account given its review
 * status: a Canceled transaction is money that did not move, so it applies
 * nothing — the same rule the summary, the breakdown, and the limit usage
 * filter by. Every write reverts and applies through this, so a Canceled
 * row is never reverted for a delta it never applied.
 */
export function appliedDeltaFor(row: {
  type: TransactionType
  amount: string
  reviewStatus: TransactionStatus
}): string {
  return row.reviewStatus === 'Canceled'
    ? '0.00'
    : deltaFor(row.type, row.amount)
}

/**
 * The account ids a write will touch, de-duplicated and ascending — the one
 * global order every multi-account write locks in, so two writes on the same
 * pair of accounts never hold one lock each while waiting for the other.
 */
export function lockOrder(accountIds: readonly number[]): number[] {
  return [...new Set(accountIds)].sort((a, b) => a - b)
}

/**
 * Locks every account a write will touch `FOR UPDATE`, in `lockOrder`, in one
 * statement. A write calls this first — before any `applyTransactionDelta` —
 * with every account it touches, so the later per-account reads find their
 * rows already locked and lock nothing new out of order.
 */
export async function lockAccounts(
  tx: DbOrTx,
  tenantId: number,
  accountIds: readonly number[]
): Promise<void> {
  const ids = lockOrder(accountIds)

  if (ids.length === 0) {
    return
  }

  await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), inArray(accounts.id, ids)))
    .orderBy(asc(accounts.id))
    .for('update')
}

/**
 * Runs a ledger transaction, retrying when Postgres aborted it for a
 * deadlock (`40P01`) or a serialization failure (`40001`) — the safety net
 * behind the ordered locks. Each retry waits a jittered, growing backoff;
 * after the last attempt the failure surfaces as a `LedgerConflictError`
 * instead of an unexplained driver error.
 */
export async function retryOnLockConflict<T>(
  run: () => Promise<T>,
  {
    attempts = 3,
    sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)),
  }: { attempts?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (!isLockConflict(error)) {
        throw error
      }

      if (attempt >= attempts) {
        throw new LedgerConflictError({ cause: error })
      }

      await sleep(attempt * 25 + Math.random() * 25)
    }
  }
}

/** Whether a database error is a deadlock or a serialization failure. The
 * driver error rides as the `cause` of drizzle's query error. */
function isLockConflict(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause]

  return candidates.some((candidate) => {
    const code = (candidate as { code?: string } | null)?.code

    return code === '40P01' || code === '40001'
  })
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
    .where(
      sql`${eq(accounts.id, accountId)} and ${eq(accounts.tenantId, tenantId)} for update`
    )

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
