import type { CreditCardStatement } from '@workspace/dto'

import { BillSource } from '../ports/upcoming-sources.js'
import type { StatementBills } from './statement-bills.js'

export class StatementBillSource extends BillSource {
  constructor(private readonly bills: Pick<StatementBills, 'pending'>) {
    super()
  }

  async pendingBills(
    tenantId: number,
    dueBy: string
  ): Promise<CreditCardStatement[]> {
    return this.bills.pending(tenantId, dueBy)
  }
}
