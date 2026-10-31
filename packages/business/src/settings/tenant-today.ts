import type { SettingsRepository } from '@workspace/db'

import type { Clock } from '../ports/clock.js'
import { todayIn } from './settings.js'

export class TenantToday {
  constructor(
    private readonly settings: Pick<SettingsRepository, 'findByTenant'>,
    private readonly clock: Clock
  ) {}

  async of(tenantId: number): Promise<string> {
    const row = await this.settings.findByTenant(tenantId)

    return todayIn(row?.timezone ?? 'UTC', this.clock.now())
  }
}
