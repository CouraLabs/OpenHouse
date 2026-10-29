import type { CreditCardStatement } from '@workspace/poco'

import { BillSource } from '../common/upcoming/upcoming-sources.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'
import { toStatement } from './statement-view.js'

/** Answers the `BillSource` port: the bills that still ask for money, with
 * their status derived against the tenant's today. */
export class StatementBillSource extends BillSource {
  constructor(private readonly repository: CreditCardStatementRepository) {
    super()
  }

  async pendingBills(
    tenantId: number,
    dueBy: string
  ): Promise<CreditCardStatement[]> {
    const today = await this.repository.todayOf(tenantId)
    const rows = await this.repository.listPending(tenantId, today, dueBy)

    return rows.map((row) => toStatement(row, today))
  }
}
