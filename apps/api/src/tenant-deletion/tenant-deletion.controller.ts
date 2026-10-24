import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common'
import {
  scheduleTenantDeletionSchema,
  type ScheduleTenantDeletionBody,
  type TenantDeletion,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession, Roles } from '../common/session/session.js'
import { TenantDeletionService } from './tenant-deletion.service.js'

/** Schedules or cancels the deletion of the session's tenant. Owner-only. */
@Roles('owner')
@Controller('tenant-deletion')
export class TenantDeletionController {
  constructor(private readonly deletion: TenantDeletionService) {}

  /** Schedules the deletion once the owner typed the tenant's name. */
  @Post()
  schedule(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(scheduleTenantDeletionSchema))
    body: ScheduleTenantDeletionBody
  ): Promise<TenantDeletion> {
    return this.deletion.schedule(
      session.tenant.id,
      session.user.id,
      body.tenantName
    )
  }

  /** Cancels the scheduled deletion. */
  @HttpCode(204)
  @Delete()
  async cancel(@CurrentSession() session: Session): Promise<void> {
    await this.deletion.cancel(session.tenant.id, session.user.id)
  }
}
