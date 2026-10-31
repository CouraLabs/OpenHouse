import type { GoalRepository, SettingsRepository } from '@workspace/db'
import type { UpcomingGoalInput } from '@workspace/dto'

import { GoalSource } from '../ports/upcoming-sources.js'

export class GoalProgressSource extends GoalSource {
  constructor(
    private readonly goals: GoalRepository,
    private readonly settings: SettingsRepository
  ) {
    super()
  }

  async progress(tenantId: number): Promise<UpcomingGoalInput[]> {
    const [rows, settings] = await Promise.all([
      this.goals.listActiveWithBalance(tenantId),
      this.settings.findByTenant(tenantId),
    ])

    if (settings === undefined) {
      return []
    }

    return rows
      .filter((row) => row.accountCurrency === settings.mainCurrency)
      .map((row) => ({
        goal: { ...row, currency: settings.mainCurrency },
        currentBalance: row.accountBalance,
      }))
  }
}
