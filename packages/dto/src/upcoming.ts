import { z } from "zod"
import {
  DEFAULT_UPCOMING_DAYS,
  MAX_UPCOMING_DAYS,
  upcomingKinds,
  type BalanceEvent,
  type FirstNegative,
  type ProjectedBalance,
  type ProjectionPoint,
  type UpcomingAccount,
  type UpcomingBill,
  type UpcomingGoal,
  type UpcomingGoalInput,
  type UpcomingInput,
  type UpcomingItem,
  type UpcomingKind,
  type UpcomingLimit,
  type UpcomingLimitInput,
  type UpcomingRecurring,
  type UpcomingResponse,
  type UpcomingRule,
} from "@workspace/domain"

export {
  DEFAULT_UPCOMING_DAYS,
  MAX_UPCOMING_DAYS,
  upcomingKinds,
  type BalanceEvent,
  type FirstNegative,
  type ProjectedBalance,
  type ProjectionPoint,
  type UpcomingAccount,
  type UpcomingBill,
  type UpcomingGoal,
  type UpcomingGoalInput,
  type UpcomingInput,
  type UpcomingItem,
  type UpcomingKind,
  type UpcomingLimit,
  type UpcomingLimitInput,
  type UpcomingRecurring,
  type UpcomingResponse,
  type UpcomingRule,
}

export const upcomingQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_UPCOMING_DAYS)
    .default(DEFAULT_UPCOMING_DAYS),
})

export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>
