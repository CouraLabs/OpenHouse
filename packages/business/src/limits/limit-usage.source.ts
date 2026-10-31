import type { UpcomingLimitInput } from '@workspace/dto'

import { LimitSource } from '../ports/upcoming-sources.js'
import type { LimitService } from './limit.service.js'

export class LimitUsageSource extends LimitSource {
  constructor(private readonly limits: LimitService) {
    super()
  }

  async usage(tenantId: number): Promise<UpcomingLimitInput[]> {
    return this.limits.usage(tenantId)
  }
}
