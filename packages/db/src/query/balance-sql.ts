import { sql } from 'drizzle-orm'
import { transactions } from '../schema.js'

export const appliedDeltaSql = sql`case
  when ${transactions.status} = 'ACTIVE' and ${transactions.reviewStatus} <> 'Canceled'
  then case when ${transactions.type} = 'Income' then ${transactions.amount} else -${transactions.amount} end
  else 0
end`
