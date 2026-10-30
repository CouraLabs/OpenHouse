import type { Account } from '@workspace/db'
import type {
  CreateTransactionBody,
  InstallmentDeleteScope,
  InstallmentsBody,
  UpdateInstallmentGroupBody,
} from '@workspace/poco'
import {
  cardCycleOf,
  INSTALLMENTS_BILLED,
  resolveSplit,
  splitInstallments,
  sumMoney,
  type SplitShare,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { BadRequestError, ConflictError, NotFoundError } from '../common/errors.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { assertMembers } from './split-members.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  InstallmentRepository,
  type GroupOutcome,
  type PurchaseWrite,
} from './installment.repository.js'
import {
  TransactionRepository,
  type TransactionRow,
} from './transaction.repository.js'

export interface InstallmentGroupView {
  groupId: string
  rows: TransactionRow[]
  total: string
  editable: boolean
}

export class InstallmentService {
  constructor(
    private readonly repository: InstallmentRepository,
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly statements: CreditCardStatementRepository,
    private readonly members: HouseholdMembers
  ) {}

  async create(
    tenantId: number,
    userId: number,
    account: Account,
    purchase: PurchaseWrite,
    amount: string,
    installments: InstallmentsBody,
    split?: CreateTransactionBody['split']
  ): Promise<TransactionRow> {
    assertSplittable(account, purchase.type)

    const parts = splitInstallments(
      amount,
      installments.count,
      installments.amountMode
    )
    const groupShares =
      split == null
        ? undefined
        : sharesOf(sumMoney(parts), split, purchase.paidByUserId ?? null)
    const rows = await this.repository.create(
      tenantId,
      userId,
      groupShares === undefined ? purchase : { ...purchase, groupShares },
      parts
    )

    return rows[0]
  }

  async find(tenantId: number, groupId: string): Promise<InstallmentGroupView> {
    const today = await this.statements.todayOf(tenantId)
    const group = await this.repository.findGroup(tenantId, groupId, today)

    if (group === undefined) {
      throw new NotFoundError(`No installment purchase ${groupId}.`)
    }

    return {
      groupId,
      rows: group.rows,
      total: sumMoney(group.rows.map((row) => row.amount)),
      editable: group.allOpen,
    }
  }

  async update(
    tenantId: number,
    userId: number,
    groupId: string,
    body: UpdateInstallmentGroupBody
  ): Promise<InstallmentGroupView> {
    await this.assertReferencesUsable(tenantId, body)

    const parts = splitInstallments(
      body.amount,
      body.installments.count,
      body.installments.amountMode
    )
    const current = await this.find(tenantId, groupId)
    const [first] = current.rows
    const payer = body.paidByUserId ?? first.paidByUserId

    if (body.paidByUserId != null || body.split != null) {
      assertMembers(
        await this.members.activeMemberIds(tenantId),
        body.paidByUserId,
        body.split
      )
    }

    if (body.split != null) {
      const account = await this.accounts.findById(tenantId, first.linkedAccountId)

      if (account?.ownership === 'shared') {
        throw new ConflictError(
          'Expenses from a shared account create no debts.'
        )
      }
    }

    const outcome = await this.repository.updateGroup(
      tenantId,
      userId,
      groupId,
      {
        name: body.name,
        note: body.note ?? null,
        categoryId: body.categoryId,
        receiverId: body.receiverId ?? null,
        ...(body.paidByUserId == null ? {} : { paidByUserId: body.paidByUserId }),
      },
      parts,
      await this.statements.todayOf(tenantId),
      body.split === undefined
        ? undefined
        : {
            shares:
              body.split === null
                ? null
                : sharesOf(sumMoney(parts), body.split, payer),
          }
    )

    unwrap(outcome, groupId)

    return this.find(tenantId, groupId)
  }

  async delete(
    tenantId: number,
    userId: number,
    groupId: string,
    scope: InstallmentDeleteScope
  ): Promise<void> {
    unwrap(
      await this.repository.deleteGroup(
        tenantId,
        userId,
        groupId,
        scope,
        await this.statements.todayOf(tenantId)
      ),
      groupId
    )
  }

  async refund(
    tenantId: number,
    userId: number,
    groupId: string,
    name: string
  ): Promise<TransactionRow | null> {
    return unwrap(
      await this.repository.refundGroup(
        tenantId,
        userId,
        groupId,
        name,
        await this.statements.todayOf(tenantId)
      ),
      groupId
    )
  }

  async convert(
    tenantId: number,
    userId: number,
    id: number,
    installments: InstallmentsBody
  ): Promise<InstallmentGroupView> {
    const row = await this.transactions.findById(tenantId, id)

    if (row === undefined || row.status === 'DELETED') {
      throw new NotFoundError(`No transaction with id ${id}.`)
    }

    const account = await this.accounts.findById(tenantId, row.linkedAccountId)

    if (account === undefined) {
      throw new NotFoundError(`No account with id ${row.linkedAccountId}.`)
    }

    if (row.installmentGroupId !== null) {
      throw new ConflictError('This purchase is already in installments.')
    }

    if (row.transferGroupId !== null || row.recurringId !== null) {
      throw new ConflictError(
        'Only a purchase entered by hand splits into installments.'
      )
    }

    assertSplittable(account, row.type)

    const rows = unwrap(
      await this.repository.convert(
        tenantId,
        userId,
        row.id,
        splitInstallments(
          row.amount,
          installments.count,
          installments.amountMode
        ),
        await this.statements.todayOf(tenantId)
      ),
      String(row.id)
    )

    return this.find(tenantId, rows[0].installmentGroupId as string)
  }

  async collapse(
    tenantId: number,
    userId: number,
    groupId: string
  ): Promise<TransactionRow> {
    return unwrap(
      await this.repository.collapse(
        tenantId,
        userId,
        groupId,
        await this.statements.todayOf(tenantId)
      ),
      groupId
    )
  }

  private async assertReferencesUsable(
    tenantId: number,
    body: Pick<CreateTransactionBody, 'categoryId' | 'receiverId'>
  ): Promise<void> {
    const category = await this.categories.findById(tenantId, body.categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundError(`No category with id ${body.categoryId}.`)
    }

    if (body.receiverId != null) {
      const receiver = await this.receivers.findById(tenantId, body.receiverId)

      if (receiver === undefined || receiver.status === 'DELETED') {
        throw new NotFoundError(`No receiver with id ${body.receiverId}.`)
      }
    }
  }
}

function sharesOf(
  total: string,
  split: NonNullable<CreateTransactionBody['split']>,
  payerUserId: number | null
): SplitShare[] {
  const resolved = resolveSplit(total, split, payerUserId)

  if (!resolved.ok) {
    throw new BadRequestError(resolved.message)
  }

  return resolved.shares
}

function assertSplittable(account: Account, type: string): void {
  if (account.type !== 'Credit Card' || type !== 'Expense') {
    throw new ConflictError(
      'Only a credit card expense splits into installments.'
    )
  }

  if (cardCycleOf(account) === null) {
    throw new ConflictError(
      "Set the card's close and due days before splitting a purchase."
    )
  }
}

function unwrap<T>(outcome: GroupOutcome<T>, groupId: string): T {
  switch (outcome.kind) {
    case 'done':
      return outcome.value
    case 'missing':
      throw new NotFoundError(`No installment purchase ${groupId}.`)
    case 'billed':
      throw new ConflictError(INSTALLMENTS_BILLED)
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}
