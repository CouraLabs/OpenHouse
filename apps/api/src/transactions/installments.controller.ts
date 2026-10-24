import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseFilters,
} from '@nestjs/common'
import type {
  DeleteInstallmentGroupQuery,
  InstallmentGroup,
  InstallmentRefund,
  InstallmentsBody,
  RefundInstallmentGroupBody,
  Transaction,
  UpdateInstallmentGroupBody,
} from '@workspace/poco'
import {
  deleteInstallmentGroupSchema,
  installmentsSchema,
  refundInstallmentGroupSchema,
  updateInstallmentGroupSchema,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import {
  InstallmentService,
  type InstallmentGroupView,
} from './installment.service.js'
import { LedgerConflictFilter } from '../common/ledger/ledger-conflict.js'
import { toWire } from './transaction-wire.js'

/**
 * The installment purchase routes: a purchase is created through
 * `POST transactions` with `installments`, and changes here as a group —
 * one installment alone changes through the row's own `PUT transactions`.
 * Every write is one ledger transaction; the session names the tenant.
 */
@Controller('transactions')
@UseFilters(LedgerConflictFilter)
export class InstallmentsController {
  constructor(private readonly installments: InstallmentService) {}

  /** Reads one purchase: its installments, total, and editability. */
  @Get('installments/:groupId')
  async find(
    @CurrentSession() session: Session,
    @Param('groupId', ParseUUIDPipe) groupId: string
  ): Promise<InstallmentGroup> {
    return toGroupWire(await this.installments.find(session.tenant.id, groupId))
  }

  /** Edits a purchase as a whole: shared fields always, amount and count
   * only while no installment is billed (409 otherwise). */
  @Put('installments/:groupId')
  async update(
    @CurrentSession() session: Session,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body(new ZodValidationPipe(updateInstallmentGroupSchema))
    body: UpdateInstallmentGroupBody
  ): Promise<InstallmentGroup> {
    return toGroupWire(
      await this.installments.update(
        session.tenant.id,
        session.user.id,
        groupId,
        body
      )
    )
  }

  /** Deletes a purchase's installments: `scope=all` (409 once billed) or
   * `scope=remaining` — those still on an Open bill. */
  @Delete('installments/:groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentSession() session: Session,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query(new ZodValidationPipe(deleteInstallmentGroupSchema))
    query: DeleteInstallmentGroupQuery
  ): Promise<void> {
    await this.installments.delete(
      session.tenant.id,
      session.user.id,
      groupId,
      query.scope
    )
  }

  /** Refunds a purchase in full: remaining installments deleted, what was
   * billed credited on the open bill. */
  @Post('installments/:groupId/refund')
  async refund(
    @CurrentSession() session: Session,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body(new ZodValidationPipe(refundInstallmentGroupSchema))
    body: RefundInstallmentGroupBody
  ): Promise<InstallmentRefund> {
    const refund = await this.installments.refund(
      session.tenant.id,
      session.user.id,
      groupId,
      body.name
    )

    return { refund: refund === null ? null : toWire(refund) }
  }

  /** Collapses a purchase back into one row, while no installment is
   * billed. */
  @Post('installments/:groupId/collapse')
  async collapse(
    @CurrentSession() session: Session,
    @Param('groupId', ParseUUIDPipe) groupId: string
  ): Promise<Transaction> {
    return toWire(
      await this.installments.collapse(
        session.tenant.id,
        session.user.id,
        groupId
      )
    )
  }

  /** Splits a single card expense into installments, while its bill is
   * Open. */
  @Post(':id/installments')
  async convert(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(installmentsSchema)) body: InstallmentsBody
  ): Promise<InstallmentGroup> {
    return toGroupWire(
      await this.installments.convert(
        session.tenant.id,
        session.user.id,
        id,
        body
      )
    )
  }
}

/** Maps a purchase onto the wire: its shared fields from installment 1. */
function toGroupWire(view: InstallmentGroupView): InstallmentGroup {
  const [first] = view.rows

  return {
    groupId: view.groupId,
    name: first.name,
    note: first.note,
    categoryId: first.categoryId,
    receiverId: first.receiverId,
    linkedAccountId: first.linkedAccountId,
    currency: first.currency,
    transactionDt: first.transactionDt,
    count: first.installmentCount ?? view.rows.length,
    total: view.total,
    editable: view.editable,
    installments: view.rows.map(toWire),
  }
}
