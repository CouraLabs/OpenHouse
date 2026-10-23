import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
} from '@nestjs/common'
import type {
  ReconcileBody,
  ReconcilePreview,
  ReconcilePreviewBody,
  ReconcileResult,
} from '@workspace/poco'
import { reconcilePreviewSchema, reconcileSchema } from '@workspace/poco'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'

import { LedgerConflictFilter } from './ledger-conflict.filter.js'
import { ReconciliationService } from './reconciliation.service.js'
import { toWire } from './transaction-wire.js'

/**
 * The reconciliation routes: preview an account against the bank's balance
 * on a day, then commit. The tenant and the user come from the session.
 */
@Controller('reconciliation')
@UseFilters(LedgerConflictFilter)
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  /** What the ledger computes on the day, the difference, and the rows
   * still on Verify. Writes nothing. */
  @Post(':accountId/preview')
  @HttpCode(HttpStatus.OK)
  async preview(
    @CurrentSession() session: Session,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body(new ZodValidationPipe(reconcilePreviewSchema))
    body: ReconcilePreviewBody
  ): Promise<ReconcilePreview> {
    const result = await this.reconciliation.preview(
      session.tenant.id,
      accountId,
      body
    )

    return {
      accountId,
      currency: result.account.currency,
      date: body.date,
      bankBalance: body.bankBalance,
      computedBalance: result.computedBalance,
      difference: result.difference,
      verifyRows: result.verifyRows.map(toWire),
      verifyCount: result.verifyCount,
    }
  }

  /** Commits the reconciliation: adjustment, checks, and the lock. */
  @Post(':accountId')
  @HttpCode(HttpStatus.OK)
  async reconcile(
    @CurrentSession() session: Session,
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body(new ZodValidationPipe(reconcileSchema)) body: ReconcileBody
  ): Promise<ReconcileResult> {
    const outcome = await this.reconciliation.reconcile(
      session.tenant.id,
      session.user.id,
      accountId,
      body
    )

    return {
      reconciledThrough: outcome.reconciledThrough,
      balance: outcome.balance,
      adjustment: outcome.adjustment === null ? null : toWire(outcome.adjustment),
      checkedCount: outcome.checkedCount,
    }
  }
}
