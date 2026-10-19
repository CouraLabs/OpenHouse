import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Account } from '@workspace/db'
import type {
  CreateRecurringTransactionBody,
  SearchRecurringTransactionsArgs,
  UpdateRecurringTransactionBody,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  RecurringTransactionRepository,
  type RecurringTransactionRow,
  type RecurringTransactionSearch,
} from './recurring-transaction.repository.js'

/**
 * The rules of recurring rules: every reference must point at a row the
 * tenant owns and has not deleted, an edit keeps the rule in its account's
 * currency, a deleted rule is a status change, and
 * the audit trail records the user the session acted as. The tenant and
 * the user always arrive from the caller — this service never reads a
 * request.
 */
@Injectable()
export class RecurringTransactionService {
  constructor(
    private readonly repository: RecurringTransactionRepository,
    private readonly receivers: ReceiverRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository
  ) {}

  /** Creates a rule for the tenant, rejecting references it cannot use. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateRecurringTransactionBody
  ): Promise<RecurringTransactionRow> {
    await this.assertReferencesUsable(tenantId, body)

    return this.repository.insert(tenantId, userId, {
      ...body,
      frequencyDay: body.frequencyDay ?? null,
      frequencyMonth: body.frequencyMonth ?? null,
    })
  }

  /** Runs the tenant's paged search. */
  async search(
    tenantId: number,
    args: SearchRecurringTransactionsArgs
  ): Promise<RecurringTransactionSearch> {
    return this.repository.search(tenantId, args)
  }

  /** Reads one rule — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<RecurringTransactionRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No recurring transaction with id ${id}.`)
    }

    return row
  }

  /** Updates a rule, rejecting references it cannot use. A deleted rule
   * updates like a missing one: it is gone for the UI. */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateRecurringTransactionBody
  ): Promise<RecurringTransactionRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(
        `No recurring transaction with id ${body.id}.`
      )
    }

    const account = await this.assertReferencesUsable(tenantId, body)

    // A rule's amount is in its account's currency: moving it to an account
    // of another currency would make every future transaction it generates
    // silently mean other money. Converting is out of scope — it would need
    // an exchange rate stored on the rule.
    if (account.id !== row.linkedAccountId) {
      const previous = await this.accounts.findById(
        tenantId,
        row.linkedAccountId
      )

      if (previous !== undefined && previous.currency !== account.currency) {
        throw new ConflictException(
          'Move the recurring transaction to an account of the same currency.'
        )
      }
    }

    const updated = await this.repository.update(tenantId, body.id, userId, {
      receiverId: body.receiverId,
      categoryId: body.categoryId,
      linkedAccountId: body.linkedAccountId,
      amount: body.amount,
      type: body.type,
      frequency: body.frequency,
      frequencyDay: body.frequencyDay ?? null,
      frequencyMonth: body.frequencyMonth ?? null,
    })

    if (updated === undefined) {
      throw new NotFoundException(
        `No recurring transaction with id ${body.id}.`
      )
    }

    return updated
  }

  /** Soft-deletes a rule. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  /** Rejects a receiver, category, or account that is missing or no longer
   * ACTIVE, and answers the account. */
  private async assertReferencesUsable(
    tenantId: number,
    body: CreateRecurringTransactionBody | UpdateRecurringTransactionBody
  ): Promise<Account> {
    const receiver = await this.receivers.findById(tenantId, body.receiverId)

    if (receiver === undefined || receiver.status === 'DELETED') {
      throw new NotFoundException(`No receiver with id ${body.receiverId}.`)
    }

    const category = await this.categories.findById(tenantId, body.categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundException(`No category with id ${body.categoryId}.`)
    }

    const account = await this.accounts.findById(tenantId, body.linkedAccountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${body.linkedAccountId}.`)
    }

    return account
  }
}
