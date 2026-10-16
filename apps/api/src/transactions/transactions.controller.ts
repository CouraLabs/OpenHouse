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
} from '@nestjs/common'
import type {
  ChangeTransactionStatusBody,
  CreateTransactionBody,
  Currency,
  EntityStatus,
  PagedResults,
  SearchTransactionsArgs,
  Transaction,
  TransactionBreakdown,
  TransactionBreakdownArgs,
  TransactionHistoryAction,
  TransactionHistoryEntry,
  TransactionSummary,
  TransactionType,
  TransferBody,
  UpdateTransactionBody,
} from '@workspace/poco'
import {
  changeTransactionStatusSchema,
  createTransactionSchema,
  searchTransactionsSchema,
  transactionBreakdownSchema,
  transferSchema,
  updateTransactionSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { TransactionService } from './transaction.service.js'

/**
 * The transaction routes. Everything here reads the tenant and the user
 * from the session, so a client can only ever see or act on its own tenant
 * — the request names no tenant anywhere. Every signed-in role manages
 * transactions.
 */
@Controller('transactions')
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

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings, the
 * day as `YYYY-MM-DD`. The entity lifecycle travels as `lifecycle`, so the
 * transaction's business `status` stays unambiguous. The `currency` and the
 * `transferGroupId` ride along: the UI formats every amount in its own
 * denomination and keeps a transfer's two sides out of the totals. */
function toWire(row: TransactionRowLike): Transaction {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    invoice: row.invoice,
    amount: row.amount,
    transactionDt: row.transactionDt,
    balanceOnDt: row.balanceOnDt,
    linkedAccountId: row.linkedAccountId,
    accountName: row.accountName,
    currency: row.currency,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    recurringId: row.recurringId,
    type: row.type,
    status: row.reviewStatus,
    statusNote: row.statusNote,
    lifecycle: row.status,
    transferGroupId: row.transferGroupId,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}

/** The columns `toWire` reads, whatever else the row carries. */
interface TransactionRowLike {
  id: number
  name: string
  note: string | null
  invoice: string | null
  amount: string
  transactionDt: string
  balanceOnDt: string
  linkedAccountId: number
  accountName: string
  currency: Currency
  categoryId: number
  categoryName: string
  categoryColor: string
  receiverId: number | null
  receiverName: string | null
  recurringId: number | null
  type: TransactionType
  reviewStatus: Transaction['status']
  statusNote: string | null
  status: EntityStatus
  transferGroupId: string | null
  createdDt: Date
  updateDt: Date
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
