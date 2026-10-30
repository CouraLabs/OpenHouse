import type { UpcomingRule } from '@workspace/poco'

import { RecurringSource } from '../common/upcoming/upcoming-sources.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'

export class RecurringRuleSource extends RecurringSource {
  constructor(
    private readonly rules: RecurringTransactionRepository,
    private readonly transactions: TransactionRepository
  ) {
    super()
  }

  activeRules(tenantId: number): Promise<UpcomingRule[]> {
    return this.rules.listActive(tenantId)
  }

  generatedOn(tenantId: number, day: string): Promise<Set<number>> {
    return this.transactions.recurringIdsOn(tenantId, day)
  }
}
