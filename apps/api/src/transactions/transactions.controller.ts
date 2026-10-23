import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseFilters,
} from '@nestjs/common'
import type {
  ChangeTransactionStatusBody,
  CreateTransactionBody,
  MoveToStatementBody,
  PagedResults,
  SearchTransactionsArgs,
  Transaction,
  TransactionBreakdown,
  TransactionBreakdownArgs,
  TransactionHistoryAction,
  TransactionHistoryEntry,
  TransactionSummary,
  TransferBody,
  UpdateTransactionBody,
} from '@workspace/poco'
import {
  changeTransactionStatusSchema,
  createTransactionSchema,
  moveToStatementSchema,
  searchTransactionsSchema,
  transactionBreakdownSchema,
  transferSchema,
  updateTransactionSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { LedgerConflictFilter } from './ledger-conflict.filter.js'
import { TransactionService } from './transaction.service.js'
import { toWire } from './transaction-wire.js'

/**
 * The transaction routes. Everything here reads the tenant and the user
 * from the session, so a client can only ever see or act on its own tenant
 * — the request names no tenant anywhere. Every signed-in role manages
 * transactions. A ledger write that keeps colliding with concurrent writes
 * on the same accounts answers 409, never 500.
 */
@Controller('transactions')
@UseFilters(LedgerConflictFilter)
export class TransactionsController {
  constructor(private readonly transactions: TransactionService) {}

  /** Creates a transaction for the tenant, moving the account's balance. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createTransactionSchema))
    body: CreateTransactionBody
  ): Promise<Transaction> {
    return toWire(
      await this.transactions.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's transactions, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchTransactionsSchema))
    args: SearchTransactionsArgs
  ): Promise<PagedResults<Transaction>> {
    const { rows, total } = await this.transactions.search(
      session.tenant.id,
      args
    )

    return { total, items: rows.map(toWire) }
  }

  /** Totals the tenant's transactions over a filter, grouped by currency. */
  @Post('summary')
  async summary(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchTransactionsSchema))
    args: SearchTransactionsArgs
  ): Promise<TransactionSummary> {
    const groups = await this.transactions.summary(
      session.tenant.id,
      args.filter
    )

    return { groups }
  }

  /** Totals the tenant's expenses over a filter, grouped by category or by
   * account, per currency — what the expense pies render. */
  @Post('breakdown')
  async breakdown(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(transactionBreakdownSchema))
    args: TransactionBreakdownArgs
  ): Promise<TransactionBreakdown> {
    const groups = await this.transactions.breakdown(session.tenant.id, args)

    return { groups }
  }

  /** Moves money between two accounts: two transactions, one database
   * transaction. */
  @Post('transfer')
  async transfer(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(transferSchema)) body: TransferBody
  ): Promise<Transaction[]> {
    const [from, to] = await this.transactions.transfer(
      session.tenant.id,
      session.user.id,
      body
    )

    return [from, to].map(toWire)
  }

  /** Reads one transaction, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Transaction> {
    return toWire(await this.transactions.find(session.tenant.id, id))
  }

  /** Reads a transaction's history: one append-only entry per change,
   * newest first. */
  @Get(':id/history')
  async history(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<TransactionHistoryEntry[]> {
    const rows = await this.transactions.findHistory(session.tenant.id, id)

    return rows.map(toHistoryWire)
  }

  /** Updates a transaction, moving both accounts' balances to match. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateTransactionSchema))
    body: UpdateTransactionBody
  ): Promise<Transaction> {
    return toWire(
      await this.transactions.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Changes only a transaction's review status: no other field is written,
   * and no balance moves. Both sides of a transfer flip together. */
  @Patch(':id/status')
  async changeStatus(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(changeTransactionStatusSchema))
    body: ChangeTransactionStatusBody
  ): Promise<Transaction> {
    return toWire(
      await this.transactions.changeStatus(session.tenant.id, session.user.id, {
        ...body,
        id,
      })
    )
  }

  /** Moves a card charge to another bill of the same card and pins it
   * there. Answers the row with a `STATEMENT_CLOSED` warning when that bill
   * is already closed. */
  @Patch(':id/statement')
  async moveToStatement(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(moveToStatementSchema))
    body: MoveToStatementBody
  ): Promise<Transaction> {
    return toWire(
      await this.transactions.moveToStatement(
        session.tenant.id,
        session.user.id,
        id,
        body
      )
    )
  }

  /** Soft-deletes a transaction: the account's balance is reverted in the
   * same database transaction that marks the row DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.transactions.softDelete(session.tenant.id, session.user.id, id)
  }
}

/** Maps a history row onto the wire shape. */
function toHistoryWire(row: {
  id: number
  transactionId: number
  action: TransactionHistoryAction
  before: unknown
  after: unknown
  createdBy: number | null
  createdDt: Date
}): TransactionHistoryEntry {
  return {
    id: row.id,
    transactionId: row.transactionId,
    action: row.action,
    before: row.before,
    after: row.after,
    createdBy: row.createdBy,
    createdDt: row.createdDt.toISOString(),
  }
}
