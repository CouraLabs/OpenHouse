import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import type {
  BalanceConsistency,
  BalanceHistory,
  BalanceHistoryBody,
} from '@workspace/poco'
import { balanceHistorySchema } from '@workspace/poco'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'

import { BalanceService } from './balance.service.js'

/**
 * The balance routes. The tenant comes from the session, never the request.
 */
@Controller('balances')
export class BalancesController {
  constructor(private readonly balances: BalanceService) {}

  /** Checks the tenant's cached balances against their ledgers and answers
   * the accounts that drifted. */
  @Get('consistency')
  async consistency(
    @CurrentSession() session: Session
  ): Promise<BalanceConsistency> {
    return this.balances.check(session.tenant.id)
  }

  /** One end-of-day balance per day of the range, for one account. */
  @Post(':accountId/history')
  @HttpCode(HttpStatus.OK)
  async history(
    @CurrentSession() session: Session,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body(new ZodValidationPipe(balanceHistorySchema))
    body: BalanceHistoryBody
  ): Promise<BalanceHistory> {
    return this.balances.history(session.tenant.id, accountId, body)
  }
}
