import { Controller, Get, Query } from '@nestjs/common'
import {
  upcomingQuerySchema,
  type UpcomingQuery,
  type UpcomingResponse,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import { CurrentSession, type Session } from '../common/session/session.js'
import { UpcomingService } from './upcoming.service.js'

/** The Upcoming panel's route. The tenant comes from the session. */
@Controller('upcoming')
export class UpcomingController {
  constructor(private readonly upcoming: UpcomingService) {}

  /** What is coming due in the next `days` days, with projected balances. */
  @Get()
  get(
    @CurrentSession() session: Session,
    @Query(new ZodValidationPipe(upcomingQuerySchema)) query: UpcomingQuery
  ): Promise<UpcomingResponse> {
    return this.upcoming.build(session.tenant.id, query.days)
  }
}
