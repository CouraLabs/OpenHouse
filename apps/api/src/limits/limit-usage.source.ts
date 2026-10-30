import type { UpcomingLimitInput } from '@workspace/poco'

import { LimitSource } from '../common/upcoming/upcoming-sources.js'
import { LimitService } from './limit.service.js'

export class LimitUsageSource extends LimitSource {
  constructor(private readonly limits: LimitService) {
    super()
  }

  async usage(tenantId: number): Promise<UpcomingLimitInput[]> {
    return this.limits.usage(tenantId)
  }
}
