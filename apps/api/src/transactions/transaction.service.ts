import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  ChangeTransactionStatusBody,
  CreateTransactionBody,
  SearchTransactionsArgs,
  TransactionBreakdownArgs,
  TransactionFilter,
  TransferBody,
  UpdateTransactionBody,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  TransactionRepository,
  type TransactionRow,
  type TransactionSearch,
} from './transaction.repository.js'

/**
 * The rules of transactions: every write moves the linked account's
 * balance in the same database transaction as the row, every change is
 * recorded as a full-snapshot history row, a deleted transaction is a
 * status change, and a transfer moves money between two ACTIVE accounts
 * of the same currency. The tenant and the user always arrive from the
 * caller — this service never reads a request.
 */
@Injectable()
export class TransactionService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository
  ) {}

  /** Creates a transaction, rejecting references the tenant cannot use. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateTransactionBody
  ): Promise<TransactionRow> {
    await this.assertReferencesUsable(tenantId, body)

    // The wire's `status` is the review workflow; the row's `status` is the
    // entity lifecycle, which only a soft delete changes — so the body's
    // field is named out before the spread, never allowed to override it.
    const { status, ...rest } = body

    return this.repository.insertWithBalance(tenantId, userId, {
      ...rest,
      note: body.note ?? null,
      invoice: body.invoice ?? null,
      receiverId: body.receiverId ?? null,
      statusNote: body.statusNote ?? null,
      recurringId: null,
      reviewStatus: status,
    })
  }

  /** Runs the tenant's paged search. */
  async search(
    tenantId: number,
    args: SearchTransactionsArgs
  ): Promise<TransactionSearch> {
    return this.repository.search(tenantId, args)
  }

  /** Totals the tenant's transactions over a filter, per currency. */
  async summary(tenantId: number, filter: TransactionFilter) {
    return this.repository.summary(tenantId, filter)
  }

  /** Totals the tenant's expenses over a filter, grouped by a breakdown's
   * dimension — category or account — per currency. */
  async breakdown(tenantId: number, args: TransactionBreakdownArgs) {
    return this.repository.breakdown(tenantId, args.dimension, args)
  }

  /** Reads one transaction — deleted included; the caller decides what to
   * show. */
  async find(tenantId: number, id: number): Promise<TransactionRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No transaction with id ${id}.`)
    }

    return row
  }

  /** Reads a transaction's history, newest first. */
  async findHistory(tenantId: number, id: number) {
    await this.find(tenantId, id)

    return this.repository.findHistory(tenantId, id)
  }

  /** Updates a transaction, rejecting references it cannot use. A deleted
   * transaction updates like a missing one: it is gone for the UI. */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateTransactionBody
  ): Promise<TransactionRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No transaction with id ${body.id}.`)
    }

    await this.assertReferencesUsable(tenantId, body)

    // As in create: the wire's `status` names out before the spread.
    const { status, id: _updateId, ...rest } = body

    const updated = await this.repository.updateWithBalance(
      tenantId,
      body.id,
      userId,
      {
        ...rest,
        note: body.note ?? null,
        invoice: body.invoice ?? null,
        receiverId: body.receiverId ?? null,
        statusNote: body.statusNote ?? null,
        recurringId: row.recurringId,
        reviewStatus: status,
      }
    )

    if (updated === undefined) {
      throw new NotFoundException(`No transaction with id ${body.id}.`)
    }

    return updated
  }

  /**
   * Changes only a transaction's review status. A deleted transaction
   * changes like a missing one: it is gone for the UI. Nothing else is
   * written — no amount, account, or day — so the balance never moves.
   */
  async changeStatus(
    tenantId: number,
    userId: number,
    body: ChangeTransactionStatusBody
  ): Promise<TransactionRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No transaction with id ${body.id}.`)
    }

    const updated = await this.repository.updateStatus(
      tenantId,
      body.id,
      userId,
      body.status
    )

    if (updated === undefined) {
      throw new NotFoundException(`No transaction with id ${body.id}.`)
    }

    return updated
  }

  /** Soft-deletes a transaction: its delta is reverted from the account in
   * the same database transaction that marks the row DELETED. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    const row = await this.find(tenantId, id)

    if (row.status === 'DELETED') {
      return
    }

    await this.repository.softDeleteWithBalance(tenantId, id, userId)
  }

  /**
   * Transfers money between two accounts: two transactions in one database
   * transaction — an Expense on the source and an Income on the
   * destination. Both accounts must be ACTIVE and share a currency.
   */
  async transfer(
    tenantId: number,
    userId: number,
    body: TransferBody
  ): Promise<[TransactionRow, TransactionRow]> {
    const from = await this.accounts.findById(tenantId, body.fromAccountId)

    if (from === undefined || from.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${body.fromAccountId}.`)
    }

    const to = await this.accounts.findById(tenantId, body.toAccountId)

    if (to === undefined || to.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${body.toAccountId}.`)
    }

    if (from.id === to.id) {
      throw new ConflictException('Pick two different accounts.')
    }

    if (from.currency !== to.currency) {
      throw new ConflictException(
        'Transfer needs two accounts of the same currency.'
      )
    }

    const category = await this.categories.findById(tenantId, body.categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundException(`No category with id ${body.categoryId}.`)
    }

    return this.repository.insertTransfer(tenantId, userId, {
      amount: body.amount,
      transactionDt: body.transactionDt,
      categoryId: body.categoryId,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      note: body.note ?? null,
    })
  }

  /** Rejects an account, category, or — when set — receiver the tenant
   * cannot use. */
  private async assertReferencesUsable(
    tenantId: number,
    body: CreateTransactionBody | UpdateTransactionBody
  ): Promise<void> {
    const account = await this.accounts.findById(tenantId, body.linkedAccountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${body.linkedAccountId}.`)
    }

    const category = await this.categories.findById(tenantId, body.categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundException(`No category with id ${body.categoryId}.`)
    }

    if (body.receiverId != null) {
      const receiver = await this.receivers.findById(tenantId, body.receiverId)

      if (receiver === undefined || receiver.status === 'DELETED') {
        throw new NotFoundException(`No receiver with id ${body.receiverId}.`)
      }
    }
  }
}
