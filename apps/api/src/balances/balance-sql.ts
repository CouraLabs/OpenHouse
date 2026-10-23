import { sql } from 'drizzle-orm'
import { transactions } from '@workspace/db'

/**
 * The delta a transactions row has applied to its account, as SQL: income
 * adds, expense subtracts, and a DELETED or Canceled row — money that did
 * not move — applies nothing. It is the SQL twin of `appliedDeltaFor`; the
 * running balance, the consistency check, and the opening-balance
 * recompute all sum it, so they cannot disagree about what counts.
 */
export const appliedDeltaSql = sql`case
  when ${transactions.status} = 'ACTIVE' and ${transactions.reviewStatus} <> 'Canceled'
  then case when ${transactions.type} = 'Income' then ${transactions.amount} else -${transactions.amount} end
  else 0
end`
