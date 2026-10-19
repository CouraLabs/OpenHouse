import { Injectable, NotFoundException } from '@nestjs/common'
import type { CreditCardStatement, SearchStatementsArgs } from '@workspace/poco'

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
}
