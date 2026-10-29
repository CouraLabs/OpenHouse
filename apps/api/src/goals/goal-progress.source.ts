import type { UpcomingGoalInput } from '@workspace/poco'

import { GoalSource } from '../common/upcoming/upcoming-sources.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { GoalRepository } from './goal.repository.js'

/**
 * Answers the `GoalSource` port: each active goal with the balance its
 * account holds now. A goal whose account is no longer in the main currency
 * (the main currency changed after it was set) tracks nothing comparable
 * and is left out.
 */
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
