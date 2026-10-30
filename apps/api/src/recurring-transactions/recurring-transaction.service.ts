import type { Account } from '@workspace/db'
import {
  parseSplit,
  resolveSplit,
  type CreateRecurringTransactionBody,
  type SearchRecurringTransactionsArgs,
  type SplitInput,
  type UpdateRecurringTransactionBody,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { BadRequestError, ConflictError, NotFoundError } from '../common/errors.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { assertMembers } from '../transactions/split-members.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  RecurringTransactionRepository,
  type RecurringTransactionRow,
  type RecurringTransactionSearch,
} from './recurring-transaction.repository.js'

export class RecurringTransactionService {
  constructor(
    private readonly repository: RecurringTransactionRepository,
    private readonly receivers: ReceiverRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
    private readonly members: HouseholdMembers
  ) {}

  async create(
    tenantId: number,
    userId: number,
    body: CreateRecurringTransactionBody
  ): Promise<RecurringTransactionRow> {
    const account = await this.assertReferencesUsable(tenantId, body)
    const payer = body.paidByUserId ?? userId

    await this.assertShares(tenantId, account, body, body.defaultSplit, payer)

    const { paidByUserId: _payer, defaultSplit, ...rule } = body

    return this.repository.insert(tenantId, userId, {
      ...rule,
      frequencyDay: body.frequencyDay ?? null,
      frequencyMonth: body.frequencyMonth ?? null,
      paidByUserId: payer,
      defaultSplit: defaultSplit ?? null,
    })
  }

  async search(
    tenantId: number,
    args: SearchRecurringTransactionsArgs
  ): Promise<RecurringTransactionSearch> {
    return this.repository.search(tenantId, args)
  }

  async find(tenantId: number, id: number): Promise<RecurringTransactionRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No recurring transaction with id ${id}.`)
    }

    return row
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateRecurringTransactionBody
  ): Promise<RecurringTransactionRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(
        `No recurring transaction with id ${body.id}.`
      )
    }

    const account = await this.assertReferencesUsable(tenantId, body)

    if (account.id !== row.linkedAccountId) {
      const previous = await this.accounts.findById(
        tenantId,
        row.linkedAccountId
      )

      if (previous !== undefined && previous.currency !== account.currency) {
        throw new ConflictError(
          'Move the recurring transaction to an account of the same currency.'
        )
      }
    }

    const payer = body.paidByUserId ?? row.paidByUserId
    const split =
      body.defaultSplit === undefined
        ? parseSplit(row.defaultSplit)
        : body.defaultSplit

    await this.assertShares(tenantId, account, body, split, payer, {
      checkMembers:
        body.defaultSplit !== undefined || body.paidByUserId != null,
    })

    const updated = await this.repository.update(tenantId, body.id, userId, {
      paidByUserId: payer,
      ...(body.defaultSplit === undefined
        ? {}
        : { defaultSplit: body.defaultSplit }),
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
      throw new NotFoundError(
        `No recurring transaction with id ${body.id}.`
      )
    }

    return updated
  }

  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  private async assertShares(
    tenantId: number,
    account: Account,
    body: CreateRecurringTransactionBody,
    split: SplitInput | null | undefined,
    payer: number | null,
    options: { checkMembers: boolean } = { checkMembers: true }
  ): Promise<void> {
    if (options.checkMembers) {
      assertMembers(
        await this.members.activeMemberIds(tenantId),
        body.paidByUserId,
        split
      )
    }

    if (split == null) {
      return
    }

    if (body.type !== 'Expense') {
      throw new BadRequestError('Only an expense can be split.')
    }

    if (account.ownership === 'shared') {
      throw new ConflictError(
        'Expenses from a shared account create no debts.'
      )
    }

    const resolved = resolveSplit(body.amount, split, payer)

    if (!resolved.ok) {
      throw new BadRequestError(resolved.message)
    }
  }

  private async assertReferencesUsable(
    tenantId: number,
    body: CreateRecurringTransactionBody | UpdateRecurringTransactionBody
  ): Promise<Account> {
    const receiver = await this.receivers.findById(tenantId, body.receiverId)

    if (receiver === undefined || receiver.status === 'DELETED') {
      throw new NotFoundError(`No receiver with id ${body.receiverId}.`)
    }

    const category = await this.categories.findById(tenantId, body.categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundError(`No category with id ${body.categoryId}.`)
    }

    const account = await this.accounts.findById(tenantId, body.linkedAccountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${body.linkedAccountId}.`)
    }

    return account
  }
}
