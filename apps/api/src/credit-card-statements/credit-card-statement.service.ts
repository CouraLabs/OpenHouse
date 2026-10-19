import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  CreditCardStatement,
  ReconcileConflict,
  ReconcileStatementBody,
  SearchStatementsArgs,
  StatementBankFiguresBody,
} from '@workspace/poco'

import { CreditCardStatementRepository } from './credit-card-statement.repository.js'
import { toStatement } from './statement-view.js'

/**
 * The bill reads: the repository derives each bill's totals from its
 * transactions; this service adds what depends on the tenant's today — the
 * status — and the amounts composed from the totals.
 */
@Injectable()
export class CreditCardStatementService {
  constructor(private readonly repository: CreditCardStatementRepository) {}

  /** Runs the tenant's paged bill search. */
  async search(
    tenantId: number,
    args: SearchStatementsArgs
  ): Promise<{ rows: CreditCardStatement[]; total: number }> {
    const today = await this.repository.todayOf(tenantId)
    const { rows, total } = await this.repository.search(tenantId, today, args)

    return { rows: rows.map((row) => toStatement(row, today)), total }
  }

  /** Reads one bill with its totals and derived status. */
  async find(tenantId: number, id: number): Promise<CreditCardStatement> {
    const row = await this.repository.findTotals(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No bill with id ${id}.`)
    }

    return toStatement(row, await this.repository.todayOf(tenantId))
  }

  /** Writes the figures typed in from the bank's bill, and answers the bill. */
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
      throw new NotFoundException(`No bill with id ${id}.`)
    }

    return this.find(tenantId, id)
  }

  /**
   * Reconciles a bill with the bank's: 409 with the bill's own total while
   * the two differ — the user moves late postings or checks rows until they
   * match — otherwise the bill is stamped and its rows marked Checked.
   */
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
        throw new NotFoundException(`No bill with id ${id}.`)
      case 'mismatch': {
        const conflict: ReconcileConflict = {
          message: "The bank's total does not match the bill's.",
          total: outcome.total,
        }

        throw new ConflictException(conflict)
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
