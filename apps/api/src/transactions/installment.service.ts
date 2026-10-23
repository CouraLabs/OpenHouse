import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
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
  splitInstallments,
  sumMoney,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
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

/** A purchase as the group routes answer it, before the wire mapping. */
export interface InstallmentGroupView {
  groupId: string
  rows: TransactionRow[]
  total: string
  editable: boolean
}

/**
 * The rules of installment purchases ("parcelado em Nx"): only a credit
 * card expense splits, on a card whose days are set, into 2–48
 * installments, installment `k` on the purchase's first bill plus `k − 1`
 * cycles. Money changes — a new amount or count, deleting or collapsing the
 * whole purchase — need every installment still on an Open bill; the
 * shared fields (name, note, category, receiver) change on every one.
 */
@Injectable()
export class InstallmentService {
  constructor(
    private readonly repository: InstallmentRepository,
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly statements: CreditCardStatementRepository
  ) {}

  /**
   * Creates a purchase split into installments — the caller validated the
   * references and answers the first installment, as a create answers its
   * row.
   */
  async create(
    tenantId: number,
    userId: number,
    account: Account,
    purchase: PurchaseWrite,
    amount: string,
    installments: InstallmentsBody
  ): Promise<TransactionRow> {
    assertSplittable(account, purchase.type)

    const rows = await this.repository.create(
      tenantId,
      userId,
      purchase,
      splitInstallments(amount, installments.count, installments.amountMode)
    )

    return rows[0]
  }

  /** Reads one purchase with its total and whether it is still editable. */
  async find(tenantId: number, groupId: string): Promise<InstallmentGroupView> {
    const today = await this.statements.todayOf(tenantId)
    const group = await this.repository.findGroup(tenantId, groupId, today)

    if (group === undefined) {
      throw new NotFoundException(`No installment purchase ${groupId}.`)
    }

    return {
      groupId,
      rows: group.rows,
      total: sumMoney(group.rows.map((row) => row.amount)),
      editable: group.allOpen,
    }
  }

  /** Edits a purchase as a whole; 409 on a money change once billed. */
  async update(
    tenantId: number,
    userId: number,
    groupId: string,
    body: UpdateInstallmentGroupBody
  ): Promise<InstallmentGroupView> {
    await this.assertReferencesUsable(tenantId, body)

    const outcome = await this.repository.updateGroup(
      tenantId,
      userId,
      groupId,
      {
        name: body.name,
        note: body.note ?? null,
        categoryId: body.categoryId,
        receiverId: body.receiverId ?? null,
      },
      splitInstallments(
        body.amount,
        body.installments.count,
        body.installments.amountMode
      ),
      await this.statements.todayOf(tenantId)
    )

    unwrap(outcome, groupId)

    return this.find(tenantId, groupId)
  }

  /** Deletes a purchase's installments: all (409 once billed), or the
   * remaining ones still Open. */
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

  /** Refunds a purchase in full: the remaining installments deleted, what
   * was billed credited on the open bill. */
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

  /**
   * Splits a single card expense into installments while its bill is
   * Open. A recurring rule's row never splits: the rule would generate
   * its day again.
   */
  async convert(
    tenantId: number,
    userId: number,
    id: number,
    installments: InstallmentsBody
  ): Promise<InstallmentGroupView> {
    const row = await this.transactions.findById(tenantId, id)

    if (row === undefined || row.status === 'DELETED') {
      throw new NotFoundException(`No transaction with id ${id}.`)
    }

    const account = await this.accounts.findById(tenantId, row.linkedAccountId)

    if (account === undefined) {
      throw new NotFoundException(`No account with id ${row.linkedAccountId}.`)
    }

    if (row.installmentGroupId !== null) {
      throw new ConflictException('This purchase is already in installments.')
    }

    if (row.transferGroupId !== null || row.recurringId !== null) {
      throw new ConflictException(
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

  /** Collapses a purchase back into one row while every installment is
   * Open. */
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

  /** Rejects a category or — when set — receiver the tenant cannot use. */
  private async assertReferencesUsable(
    tenantId: number,
    body: Pick<CreateTransactionBody, 'categoryId' | 'receiverId'>
  ): Promise<void> {
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

/** Only a credit card expense splits, and only on a card whose bills
 * exist — its close and due days set. */
function assertSplittable(account: Account, type: string): void {
  if (account.type !== 'Credit Card' || type !== 'Expense') {
    throw new ConflictException(
      'Only a credit card expense splits into installments.'
    )
  }

  if (cardCycleOf(account) === null) {
    throw new ConflictException(
      "Set the card's close and due days before splitting a purchase."
    )
  }
}

/** Answers a group write's value, or throws its failure as HTTP. */
function unwrap<T>(outcome: GroupOutcome<T>, groupId: string): T {
  switch (outcome.kind) {
    case 'done':
      return outcome.value
    case 'missing':
      throw new NotFoundException(`No installment purchase ${groupId}.`)
    case 'billed':
      throw new ConflictException(INSTALLMENTS_BILLED)
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}
