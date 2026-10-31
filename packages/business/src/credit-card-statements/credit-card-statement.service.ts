import type { CreditCardStatementRepository } from '@workspace/db'
import type {
  CreditCardStatement,
  ReconcileConflict,
  ReconcileStatementBody,
  SearchStatementsArgs,
  StatementBankFiguresBody,
  StatementReconcilePreview,
} from '@workspace/dto'

import { addMoney, compareMoney, moneyTone, negateMoney } from '../calc/money.js'
import type { TenantToday } from '../settings/tenant-today.js'
import { ConflictError, NotFoundError } from '../errors.js'
import { defaultPaymentStatement } from './credit-card-statements.js'
import type { StatementBills } from './statement-bills.js'
import { toStatement } from './statement-view.js'

export class CreditCardStatementService {
  constructor(
    private readonly repository: CreditCardStatementRepository,
    private readonly bills: Pick<StatementBills, 'search'>,
    private readonly today: Pick<TenantToday, 'of'>
  ) {}

  async search(
    tenantId: number,
    args: SearchStatementsArgs
  ): Promise<{ rows: CreditCardStatement[]; total: number }> {
    const { rows, total, today } = await this.bills.search(tenantId, args)
    const initial = rows.map((row) => toStatement(row, today))
    const byAccount = new Map<number, CreditCardStatement[]>()

    for (const bill of initial) {
      const list = byAccount.get(bill.accountId) ?? []
      list.push(bill)
      byAccount.set(bill.accountId, list)
    }

    const defaultIds = new Set<number>()
    for (const bills of byAccount.values()) {
      const defaulted = defaultPaymentStatement(bills)
      if (defaulted !== undefined) {
        defaultIds.add(defaulted.id)
      }
    }

    return {
      rows: initial.map((bill) =>
        defaultIds.has(bill.id) ? { ...bill, isDefaultPayment: true } : bill
      ),
      total,
    }
  }

  async find(tenantId: number, id: number): Promise<CreditCardStatement> {
    const row = await this.repository.findTotals(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No bill with id ${id}.`)
    }

    return toStatement(row, await this.today.of(tenantId))
  }

  async previewReconcile(
    tenantId: number,
    id: number,
    body: ReconcileStatementBody
  ): Promise<StatementReconcilePreview> {
    const bill = await this.find(tenantId, id)
    const difference = addMoney(body.bankTotal, negateMoney(bill.total))

    return {
      difference,
      tone: moneyTone(difference),
    }
  }

  async updateBankFigures(
    tenantId: number,
    userId: number,
    id: number,
    body: StatementBankFiguresBody
  ): Promise<CreditCardStatement> {
    const row = await this.repository.updateBankFigures(
      tenantId,
      userId,
      id,
      body
    )

    if (row === undefined) {
      throw new NotFoundError(`No bill with id ${id}.`)
    }

    return this.find(tenantId, id)
  }

  async reconcile(
    tenantId: number,
    userId: number,
    id: number,
    body: ReconcileStatementBody
  ): Promise<CreditCardStatement> {
    const statement = await this.repository.findActive(tenantId, id)
    const totals = await this.repository.findTotals(tenantId, id)

    if (statement === undefined || totals === undefined) {
      throw new NotFoundError(`No bill with id ${id}.`)
    }

    if (compareMoney(totals.total, body.bankTotal) !== 0) {
      const conflict: ReconcileConflict = {
        message: "The bank's total does not match the bill's.",
        total: totals.total,
      }

      throw new ConflictError(conflict)
    }

    const rows = await this.repository.listBillRows(tenantId, id)

    await this.repository.markReconciled(
      tenantId,
      userId,
      statement,
      rows.filter((row) => row.reviewStatus === 'Verify'),
      body.bankTotal
    )

    return this.find(tenantId, id)
  }
}
