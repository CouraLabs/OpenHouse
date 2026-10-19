import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import type {
  CreditCardStatement,
  PagedResults,
  SearchStatementsArgs,
} from '@workspace/poco'
import { searchStatementsSchema } from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { CreditCardStatementService } from './credit-card-statement.service.js'

/**
 * The bill routes — read-only: a bill is opened by the first charge that
 * lands on it, and its totals and status are derived. The session names
 * the tenant; a bill's transactions are listed through
 * `POST transactions/search` with `filter.statementId`.
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
}
