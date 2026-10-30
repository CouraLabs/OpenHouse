import {
  assembleUpcoming,
  shiftDay,
  todayIn,
  type UpcomingResponse,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { Clock } from '../common/clock/clock.js'
import { NotFoundError } from '../common/errors.js'
import {
  BillSource,
  GoalSource,
  LimitSource,
  RecurringSource,
} from '../common/upcoming/upcoming-sources.js'
import { SettingsRepository } from '../settings/settings.repository.js'

export class UpcomingService {
  constructor(
    private readonly bills: BillSource,
    private readonly recurring: RecurringSource,
    private readonly limits: LimitSource,
    private readonly goals: GoalSource,
    private readonly accounts: AccountRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  async build(tenantId: number, days: number): Promise<UpcomingResponse> {
    const settings = await this.settings.findByTenant(tenantId)

    if (settings === undefined) {
      throw new NotFoundError('Settings not found.')
    }

    const today = todayIn(settings.timezone, this.clock.now())
    const end = shiftDay(today, days)

    const [accounts, bills, rules, materializedToday, limits, goals] =
      await Promise.all([
        this.accounts.listActive(tenantId),
        this.bills.pendingBills(tenantId, end),
        this.recurring.activeRules(tenantId),
        this.recurring.generatedOn(tenantId, today),
        this.limits.usage(tenantId),
        this.goals.progress(tenantId),
      ])

    return assembleUpcoming({
      today,
      days,
      accounts,
      bills,
      rules,
      materializedToday,
      limits,
      goals,
    })
  }
}
