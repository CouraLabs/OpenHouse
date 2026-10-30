import type {
  CreditCardStatement,
  UpcomingGoalInput,
  UpcomingLimitInput,
  UpcomingRule,
} from '@workspace/poco'

export abstract class BillSource {
  abstract pendingBills(
    tenantId: number,
    dueBy: string
  ): Promise<CreditCardStatement[]>
}

export abstract class RecurringSource {
  abstract activeRules(tenantId: number): Promise<UpcomingRule[]>

  abstract generatedOn(tenantId: number, day: string): Promise<Set<number>>
}

export abstract class LimitSource {
  abstract usage(tenantId: number): Promise<UpcomingLimitInput[]>
}

export abstract class GoalSource {
  abstract progress(tenantId: number): Promise<UpcomingGoalInput[]>
}
