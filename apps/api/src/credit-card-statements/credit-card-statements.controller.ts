import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common'
import type {
  CreditCardStatement,
  PagedResults,
  ReconcileStatementBody,
  SearchStatementsArgs,
  StatementBankFiguresBody,
} from '@workspace/poco'
import {
  reconcileStatementSchema,
  searchStatementsSchema,
  statementBankFiguresSchema,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { CreditCardStatementService } from './credit-card-statement.service.js'

/**
 * The bill routes: a bill is opened by the first charge that lands on it,
 * and its totals and status are derived — the only writes are the figures
 * typed in from the bank's bill and the reconciliation. The session names
 * the tenant; a bill's charges and payments are listed through
 * `POST transactions/search` with `filter.statementId` or
 * `filter.paymentStatementId`, and a payment is a transfer into the card
 * (`POST transactions/transfer` with `paymentStatementId`).
 */
@Controller('credit-card-statements')
export class CreditCardStatementsController {
  constructor(private readonly statements: CreditCardStatementService) {}

  /** Searches the tenant's bills, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchStatementsSchema))
    args: SearchStatementsArgs
  ): Promise<PagedResults<CreditCardStatement>> {
    const { rows, total } = await this.statements.search(
      session.tenant.id,
      args
    )

    return { total, items: rows }
  }

  /** Reads one bill with its totals and status. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<CreditCardStatement> {
    return this.statements.find(session.tenant.id, id)
  }

  /** Writes the minimum payment and total typed in from the bank's bill. */
  @Patch(':id')
  async updateBankFigures(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(statementBankFiguresSchema))
    body: StatementBankFiguresBody
  ): Promise<CreditCardStatement> {
    return this.statements.updateBankFigures(
      session.tenant.id,
      session.user.id,
      id,
      body
    )
  }

  /** Reconciles a bill with the bank's total: 409 with the bill's own
   * total while they differ. */
  @Post(':id/reconcile')
  async reconcile(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(reconcileStatementSchema))
    body: ReconcileStatementBody
  ): Promise<CreditCardStatement> {
    return this.statements.reconcile(
      session.tenant.id,
      session.user.id,
      id,
      body
    )
  }
}
