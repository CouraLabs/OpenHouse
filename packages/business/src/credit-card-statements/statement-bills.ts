import type { CreditCardStatementRepository } from '@workspace/db'
import {
  unpaidStatementStatuses,
  type CreditCardStatement,
  type Currency,
  type SearchStatementsArgs,
  type SortClause,
} from '@workspace/dto'

import { compareMoney } from '../calc/money.js'
import type { TenantToday } from '../settings/tenant-today.js'
import { defaultPaymentStatement } from './credit-card-statements.js'
import type { StatementPlacer } from './statement-placer.js'
import { type StatementTotalsRow, toStatement } from './statement-view.js'

type BillsRepository = Pick<
  CreditCardStatementRepository,
  'listTotals' | 'ensureBill'
>

export function hasActivity(
  row: Pick<StatementTotalsRow, 'transactionCount' | 'paymentCount'>
): boolean {
  return row.transactionCount > 0 || row.paymentCount > 0
}

const PENDING_STATUSES: ReadonlyArray<CreditCardStatement['status']> = [
  'Open',
  'Closed',
  'PartiallyPaid',
  'Overdue',
]

function compareField(
  a: StatementTotalsRow,
  b: StatementTotalsRow,
  field: string
): number | undefined {
  switch (field) {
    case 'dueDate':
    case 'closeDate':
    case 'periodStart':
    case 'accountName': {
      const left = a[field]
      const right = b[field]

      return left < right ? -1 : left > right ? 1 : 0
    }
    case 'total':
      return compareMoney(a.total, b.total)
    case 'id':
      return a.id - b.id
    default:
      return undefined
  }
}

export function sortStatementRows(
  rows: readonly StatementTotalsRow[],
  sort: readonly SortClause[]
): StatementTotalsRow[] {
  return [...rows].sort((a, b) => {
    for (const clause of sort) {
      const order = compareField(a, b, clause.field)

      if (order !== undefined && order !== 0) {
        return clause.dir === 'desc' ? -order : order
      }
    }

    return a.id - b.id
  })
}

export class StatementBills {
  constructor(
    private readonly statements: BillsRepository,
    private readonly placer: Pick<StatementPlacer, 'place'>,
    private readonly today: Pick<TenantToday, 'of'>
  ) {}

  async search(
    tenantId: number,
    args: SearchStatementsArgs
  ): Promise<{
    rows: StatementTotalsRow[]
    total: number
    today: string
  }> {
    const today = await this.today.of(tenantId)
    const statuses = args.filter.status ?? []
    const rows = (
      await this.statements.listTotals(
        tenantId,
        args.filter.accountId === undefined
          ? {}
          : { accountId: args.filter.accountId }
      )
    ).filter(
      (row) =>
        hasActivity(row) &&
        (statuses.length === 0 ||
          statuses.includes(toStatement(row, today).status))
    )
    const sorted = sortStatementRows(rows, args.sort)

    return {
      rows: sorted.slice(args.skip, args.skip + args.limit),
      total: sorted.length,
      today,
    }
  }

  async pending(
    tenantId: number,
    dueBy: string
  ): Promise<CreditCardStatement[]> {
    const today = await this.today.of(tenantId)
    const rows = await this.statements.listTotals(tenantId, {
      activeAccountsOnly: true,
    })

    return sortStatementRows(
      rows.filter((row) => hasActivity(row) && row.dueDate <= dueBy),
      [{ field: 'dueDate', dir: 'asc' }]
    )
      .map((row) => toStatement(row, today))
      .filter((bill) => PENDING_STATUSES.includes(bill.status))
  }

  async ofAccount(
    tenantId: number,
    accountId: number
  ): Promise<CreditCardStatement[]> {
    const today = await this.today.of(tenantId)
    const rows = await this.statements.listTotals(tenantId, { accountId })

    return sortStatementRows(rows.filter(hasActivity), [
      { field: 'closeDate', dir: 'asc' },
    ]).map((row) => toStatement(row, today))
  }

  async unpaidSummary(
    tenantId: number,
    accountId: number
  ): Promise<{ unpaidBills: number; amountDue: string; currency: Currency }> {
    const bills = await this.ofAccount(tenantId, accountId)
    const latest = bills.at(-1)

    return {
      unpaidBills: bills.filter((bill) =>
        unpaidStatementStatuses.includes(bill.status)
      ).length,
      amountDue: latest?.amountDue ?? '0.00',
      currency: latest?.currency ?? 'USD',
    }
  }

  async defaultPaymentStatementId(
    tenantId: number,
    userId: number,
    accountId: number
  ): Promise<number | null> {
    const defaulted = defaultPaymentStatement(
      await this.ofAccount(tenantId, accountId)
    )

    if (defaulted !== undefined) {
      return defaulted.id
    }

    const target = await this.placer.place(tenantId, {
      linkedAccountId: accountId,
      transactionDt: await this.today.of(tenantId),
      type: 'Expense',
      isTransferLeg: false,
    })

    if (target.kind !== 'bill') {
      return null
    }

    return (await this.statements.ensureBill(tenantId, userId, target)) ?? null
  }
}
