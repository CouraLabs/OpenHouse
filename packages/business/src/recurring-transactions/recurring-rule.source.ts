import type {
  RecurringTransactionRepository,
  TransactionRepository,
} from '@workspace/db'
import type { UpcomingRule } from '@workspace/dto'

import { RecurringSource } from '../ports/upcoming-sources.js'

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
