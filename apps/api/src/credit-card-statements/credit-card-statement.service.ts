import type {
  CreditCardStatement,
  ReconcileConflict,
  ReconcileStatementBody,
  SearchStatementsArgs,
  StatementBankFiguresBody,
} from '@workspace/poco'

import { ConflictError, NotFoundError } from '../common/errors.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'
import { toStatement } from './statement-view.js'

export class CreditCardStatementService {
  constructor(private readonly repository: CreditCardStatementRepository) {}

  async search(
    tenantId: number,
    args: SearchStatementsArgs
  ): Promise<{ rows: CreditCardStatement[]; total: number }> {
    const today = await this.repository.todayOf(tenantId)
    const { rows, total } = await this.repository.search(tenantId, today, args)

    return { rows: rows.map((row) => toStatement(row, today)), total }
  }

  async find(tenantId: number, id: number): Promise<CreditCardStatement> {
    const row = await this.repository.findTotals(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No bill with id ${id}.`)
    }

    return toStatement(row, await this.repository.todayOf(tenantId))
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
    const outcome = await this.repository.reconcile(
      tenantId,
      userId,
      id,
      body.bankTotal
    )

    switch (outcome.kind) {
      case 'missing':
        throw new NotFoundError(`No bill with id ${id}.`)
      case 'mismatch': {
        const conflict: ReconcileConflict = {
          message: "The bank's total does not match the bill's.",
          total: outcome.total,
        }

        throw new ConflictError(conflict)
      }
      case 'reconciled':
        return this.find(tenantId, id)
      default: {
        const exhaustive: never = outcome
        throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
      }
    }
  }
}
