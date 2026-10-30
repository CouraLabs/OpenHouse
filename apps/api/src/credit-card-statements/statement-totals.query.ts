import { and, eq, isNotNull, ne, sql, type SQL } from 'drizzle-orm'
import type { DbOrTx } from '@workspace/db'
import { creditCardStatements, transactions } from '@workspace/db'
import type { StatementStatus } from '@workspace/poco'

export function statementTotals(
  db: DbOrTx,
  tenantId: number,
  accountScope?: SQL
) {
  const payments = db
    .select({
      statementId: transactions.paymentStatementId,
      paid: sql<number>`sum(${transactions.amount})`.as('paid'),
      count: sql<number>`count(*)`.as('payment_count'),
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
        transactionCount: sql<number>`count(${transactions.id})`.as(
          'transaction_count'
        ),
        paymentCount: sql<number>`coalesce(max(${payments.count}), 0)`.as(
          'payment_count'
        ),
        charges:
          sql<number>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'Expense'), 0)`.as(
            'charges'
          ),
        credits:
          sql<number>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'Income'), 0)`.as(
            'credits'
          ),
        paid: sql<number>`coalesce(max(${payments.paid}), 0)`.as('paid'),
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
        total: sql<number>`(${net.charges} - ${net.credits})`.as('total'),
        previousBalance:
          sql<number>`coalesce(sum(${net.charges} - ${net.credits} - ${net.paid}) over (partition by ${net.accountId} order by ${net.closeDate} rows between unbounded preceding and 1 preceding), 0)`.as(
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

export type StatementRun = ReturnType<typeof statementTotals>['run']

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
