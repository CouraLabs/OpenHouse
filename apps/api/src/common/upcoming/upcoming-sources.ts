import type {
  CreditCardStatement,
  UpcomingGoalInput,
  UpcomingLimitInput,
  UpcomingRule,
} from '@workspace/poco'

/**
 * The ports the upcoming list and the reminder cron read their four sources
 * through. Each is an abstract class (also its injection token) that one
 * feature implements and provides under it — card bills, recurring rules,
 * limits, goals — so the two callers depend on the abstraction and never on
 * the feature behind it. Every method takes the tenant explicitly.
 */

/** The card bills that still ask for money. */
export abstract class BillSource {
  /** The tenant's Open, Closed, PartiallyPaid and Overdue bills due on or
   * before `dueBy`, with their derived totals. */
  abstract pendingBills(
    tenantId: number,
    dueBy: string
  ): Promise<CreditCardStatement[]>
}

/** The recurring rules. */
export abstract class RecurringSource {
  /** The tenant's ACTIVE rules. */
  abstract activeRules(tenantId: number): Promise<UpcomingRule[]>

  /** The ids of the rules whose transaction for `day` already exists. */
  abstract generatedOn(tenantId: number, day: string): Promise<Set<number>>
}

/** The limits. */
export abstract class LimitSource {
  /** Every ACTIVE limit with what its current period has spent. */
  abstract usage(tenantId: number): Promise<UpcomingLimitInput[]>
}

/** The goals. */
export abstract class GoalSource {
  /** Every ACTIVE goal with the balance its linked account holds now. */
  abstract progress(tenantId: number): Promise<UpcomingGoalInput[]>
}
