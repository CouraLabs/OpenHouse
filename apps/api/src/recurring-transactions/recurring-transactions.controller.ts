import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common'
import type {
  CreateRecurringTransactionBody,
  Currency,
  EntityStatus,
  Frequency,
  PagedResults,
  RecurringTransaction,
  SearchRecurringTransactionsArgs,
  TransactionType,
  UpdateRecurringTransactionBody,
} from '@workspace/poco'
import {
  createRecurringTransactionSchema,
  searchRecurringTransactionsSchema,
  updateRecurringTransactionSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { RecurringTransactionService } from './recurring-transaction.service.js'

/**
 * The recurring rule routes. Everything here reads the tenant and the user
 * from the session, so a client can only ever see or act on its own tenant
 * — the request names no tenant anywhere. Every signed-in role manages
 * recurring rules.
 */
@Controller('recurring-transactions')
export class RecurringTransactionsController {
  constructor(private readonly recurring: RecurringTransactionService) {}

  /** Creates a recurring rule for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createRecurringTransactionSchema))
    body: CreateRecurringTransactionBody
  ): Promise<RecurringTransaction> {
    return toWire(
      await this.recurring.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's rules, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchRecurringTransactionsSchema))
    args: SearchRecurringTransactionsArgs
  ): Promise<PagedResults<RecurringTransaction>> {
    const { rows, total } = await this.recurring.search(session.tenant.id, args)

    return { total, items: rows.map(toWire) }
  }

  /** Reads one rule, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<RecurringTransaction> {
    return toWire(await this.recurring.find(session.tenant.id, id))
  }

  /** Updates a rule. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateRecurringTransactionSchema))
    body: UpdateRecurringTransactionBody
  ): Promise<RecurringTransaction> {
    return toWire(
      await this.recurring.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Soft-deletes a rule: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.recurring.softDelete(session.tenant.id, session.user.id, id)
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
function toWire(row: {
  id: number
  receiverId: number
  receiverName: string
  categoryId: number
  categoryName: string
  linkedAccountId: number
  accountName: string
  accountCurrency: Currency
  amount: string
  type: TransactionType
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): RecurringTransaction {
  return {
    id: row.id,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    linkedAccountId: row.linkedAccountId,
    accountName: row.accountName,
    accountCurrency: row.accountCurrency,
    amount: row.amount,
    type: row.type,
    frequency: row.frequency,
    frequencyDay: row.frequencyDay,
    frequencyMonth: row.frequencyMonth,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
