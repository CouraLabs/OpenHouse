import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import {
  householdOverviewSchema,
  type HouseholdMember,
  type HouseholdOverview,
  type HouseholdOverviewArgs,
  type MemberBalanceCheck,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { HouseholdService } from './household.service.js'

/**
 * The household routes, open to every signed-in member: the people an
 * expense can be shared with, the balances between them, and the check
 * that runs before a member is removed. Settling up is recorded through
 * the transactions routes, as a transfer.
 */
@Controller('household')
export class HouseholdController {
  constructor(private readonly household: HouseholdService) {}

  /** Lists the members, removed ones included. */
  @Get('members')
  listMembers(@CurrentSession() session: Session): Promise<HouseholdMember[]> {
    return this.household.listMembers(session.tenant.id)
  }

  /** The balance a member still holds, so the removal can warn first. */
  @Get('members/:id/balance')
  balanceCheck(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<MemberBalanceCheck> {
    return this.household.balanceCheck(session.tenant.id, id)
  }

  /** Balances, settle-up suggestions, spending, and settlement history. */
  @HttpCode(200)
  @Post('overview')
  overview(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(householdOverviewSchema))
    body: HouseholdOverviewArgs
  ): Promise<HouseholdOverview> {
    return this.household.overview(session.tenant.id, body)
  }
}
