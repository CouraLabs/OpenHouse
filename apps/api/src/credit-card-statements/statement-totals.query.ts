import { and, eq, isNotNull, ne, sql, type SQL } from 'drizzle-orm'
import type { DbOrTx } from '@workspace/db'
import { creditCardStatements, transactions } from '@workspace/db'
import type { StatementStatus } from '@workspace/poco'

/**
 * The common table expressions every bill read derives from — totals are
 * never stored, so they never drift from the transactions they sum.
 *
 * `statement_net` aggregates each bill's ACTIVE, non-Canceled transactions:
 * - `charges`: its expenses, a transfer out of the card included;
 * - `credits`: its incomes — refunds; the card side of a payment lands on
 *   no bill by date, so it is never among them;
 * - `paid`: the payments that settle it — the card sides of transfers whose
 *   `paymentStatementId` names it, summed in a subquery of their own so
 *   they never multiply the charge rows.
 *
 * `statement_run` adds the carry-over: a bill's `previousBalance` is the
 * running sum of `total − paid` over the same card's earlier bills, in close
 * order — a positive remainder rolls forward, an overpayment rolls forward
 * as a credit. The window covers every bill of the card, never just the
 * page a search asks for, so paging cannot cut a carry-over short. Derived
 * on every read and never cached (rule 6f): a payment or a charge on an
 * earlier bill changes every later bill the moment it commits.
 * `nextDueDate` is the due date of the card's next bill — where this one's
 * remainder rolled.
 *
 * Every sum is cast to `numeric(16,2)`, so money reads back as a
 * two-decimal string and never crosses a float.
 */
export function statementTotals(
  db: DbOrTx,
  tenantId: number,
  accountScope?: SQL
) {
  const payments = db
    .select({
      statementId: transactions.paymentStatementId,
      paid: sql<string>`sum(${transactions.amount})`.as('paid'),
      count: sql<number>`count(*)::int`.as('payment_count'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        isNotNull(transactions.paymentStatementId),
        eq(transactions.status, 'ACTIVE'),
        ne(transactions.reviewStatus, 'Canceled')
      )
    )
    .groupBy(transactions.paymentStatementId)
    .as('statement_payments')

  const net = db.$with('statement_net').as(
    db
      .select({
        id: creditCardStatements.id,
        accountId: creditCardStatements.accountId,
        periodStart: creditCardStatements.periodStart,
        closeDate: creditCardStatements.closeDate,
        dueDate: creditCardStatements.dueDate,
        closedAt: creditCardStatements.closedAt,
        minimumDue: creditCardStatements.minimumDue,
        bankTotal: creditCardStatements.bankTotal,
        reconciledAt: creditCardStatements.reconciledAt,
        transactionCount: sql<number>`count(${transactions.id})::int`.as(
          'transaction_count'
        ),
        paymentCount: sql<number>`coalesce(max(${payments.count}), 0)::int`.as(
          'payment_count'
        ),
        charges:
          sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'Expense'), 0)::numeric(16,2)`.as(
            'charges'
          ),
        credits:
          sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'Income'), 0)::numeric(16,2)`.as(
            'credits'
          ),
        paid: sql<string>`coalesce(max(${payments.paid}), 0)::numeric(16,2)`.as(
          'paid'
        ),
      })
      .from(creditCardStatements)
      .leftJoin(
        transactions,
        and(
          eq(transactions.statementId, creditCardStatements.id),
          eq(transactions.tenantId, creditCardStatements.tenantId),
          eq(transactions.status, 'ACTIVE'),
          ne(transactions.reviewStatus, 'Canceled')
        )
      )
      .leftJoin(payments, eq(payments.statementId, creditCardStatements.id))
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.status, 'ACTIVE'),
          accountScope
        )
      )
      .groupBy(creditCardStatements.id)
  )

  const run = db.$with('statement_run').as(
    db
      .select({
        id: net.id,
        accountId: net.accountId,
        periodStart: net.periodStart,
        closeDate: net.closeDate,
        dueDate: net.dueDate,
        closedAt: net.closedAt,
        minimumDue: net.minimumDue,
        bankTotal: net.bankTotal,
        reconciledAt: net.reconciledAt,
        transactionCount: net.transactionCount,
        paymentCount: net.paymentCount,
        charges: net.charges,
        credits: net.credits,
        paid: net.paid,
        total: sql<string>`(${net.charges} - ${net.credits})::numeric(16,2)`.as(
          'total'
        ),
        previousBalance:
          sql<string>`coalesce(sum(${net.charges} - ${net.credits} - ${net.paid}) over (partition by ${net.accountId} order by ${net.closeDate} rows between unbounded preceding and 1 preceding), 0)::numeric(16,2)`.as(
            'previous_balance'
          ),
        nextDueDate: sql<
          string | null
        >`lead(${net.dueDate}) over (partition by ${net.accountId} order by ${net.closeDate})`.as(
          'next_due_date'
        ),
      })
      .from(net)
  )

  return { net, run }
}

/** The bills' derived fields, as the outer select reads them. */
export type StatementRun = ReturnType<typeof statementTotals>['run']

/**
 * The SQL twin of poco's `deriveStatementStatus`, for a search that
 * filters on status: the same precedence, with the tenant's today bound as
 * a parameter. The service still stamps every wire row through the pure
 * function; an e2e spec holds the two in step.
 */
export function statusCondition(
  run: StatementRun,
  today: string,
  status: StatementStatus
): SQL {
  const owed = sql`(${run.previousBalance} + ${run.total})`
  const closed = sql`${run.closeDate} <= ${today}`
  const unpaid = sql`${closed} and ${run.paid} < ${owed}`

  switch (status) {
    case 'Open':
      return sql`${run.closeDate} > ${today}`
    case 'Paid':
      return sql`${closed} and ${run.paid} >= ${owed}`
    case 'Overdue':
      return sql`${unpaid} and ${run.dueDate} < ${today}`
    case 'PartiallyPaid':
      return sql`${unpaid} and ${run.dueDate} >= ${today} and ${run.paid} > 0`
    case 'Closed':
      return sql`${unpaid} and ${run.dueDate} >= ${today} and ${run.paid} <= 0`
    default: {
      const exhaustive: never = status
      throw new Error(`Unhandled status: ${String(exhaustive)}`)
    }
  }
}
