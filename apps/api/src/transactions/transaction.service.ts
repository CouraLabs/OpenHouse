import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Account } from '@workspace/db'
import {
  CARD_PAYMENT_CATEGORY,
  inheritShares,
  resolveSplit,
  SETTLEMENT_CATEGORY,
  toCents,
  type SettleUpBody,
  type SplitInput,
  type SplitShare,
} from '@workspace/poco'
import type {
  ChangeTransactionStatusBody,
  CreateTransactionBody,
  MoveToStatementBody,
  ReconciledEditConflict,
  SearchTransactionsArgs,
  TransactionBreakdownArgs,
  TransactionFilter,
  TransferBody,
  UpdateTransactionBody,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { assertMembers } from '../common/household/split-members.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { InstallmentService } from './installment.service.js'
import {
  TransactionRepository,
  type TransactionRow,
  type TransactionSearch,
} from './transaction.repository.js'

/**
 * Answers 409 with the lock date when a day falls on or before the
 * account's `reconciledThrough` and the caller has not confirmed. Dates are
 * `YYYY-MM-DD`, so the string order is the calendar order.
 */
function assertDateOpen(
  account: Account,
  date: string,
  confirmed: boolean | undefined
): void {
  if (
    confirmed === true ||
    account.reconciledThrough === null ||
    date > account.reconciledThrough
  ) {
    return
  }

  const conflict: ReconciledEditConflict = {
    message:
      'This day was reconciled with the bank. Confirm to change it.',
    reconciledThrough: account.reconciledThrough,
  }

  throw new ConflictException(conflict)
}

/** Only an expense of the household's own splits: not an income, and not
 * what a shared account pays (it creates no debts). */
function assertSplittable(account: Account, type: string): void {
  if (type !== 'Expense') {
    throw new BadRequestException('Only an expense can be split.')
  }

  if (account.ownership === 'shared') {
    throw new ConflictException(
      'Expenses from a shared account create no debts.'
    )
  }
}

/** Resolves a split of an amount, answering 400 when it does not fit. */
function sharesOf(
  amount: string,
  split: SplitInput,
  payerUserId: number | null
): SplitShare[] {
  const resolved = resolveSplit(amount, split, payerUserId)

  if (!resolved.ok) {
    throw new BadRequestException(resolved.message)
  }

  return resolved.shares
}

/**
 * The rules of transactions: every write moves the linked account's
 * balance in the same database transaction as the row, every change is
 * recorded as a full-snapshot history row, a deleted transaction is a
 * status change, a transfer moves money between two ACTIVE accounts of the
 * same currency, and an edit never moves a transaction into another
 * currency. The tenant and the user always arrive from the caller — this
 * service never reads a request.
 */
@Injectable()
export class TransactionService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly statements: CreditCardStatementRepository,
    private readonly installments: InstallmentService,
    private readonly members: HouseholdMembers
  ) {}

  /** Creates a transaction, rejecting references the tenant cannot use. A
   * card expense with `installments.count > 1` becomes one row per
   * installment; the answer is the first. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateTransactionBody
  ): Promise<TransactionRow> {
    const account = await this.assertReferencesUsable(tenantId, body)

    // A backdated row inside a reconciled period changes a balance the
    // bank already confirmed: it asks first, like an edit does.
    assertDateOpen(account, body.transactionDt, body.confirmReconciled)

    await this.assertPayerAndSplit(tenantId, body.paidByUserId, body.split)

    // The wire's `status` is the review workflow; the row's `status` is the
    // entity lifecycle, which only a soft delete changes — so the body's
    // field is named out before the spread, never allowed to override it.
    const {
      status,
      installments,
      confirmReconciled: _confirm,
      split,
      paidByUserId,
      ...rest
    } = body
    const payer = paidByUserId ?? userId
    const write = {
      ...rest,
      paidByUserId: payer,
      note: body.note ?? null,
      invoice: body.invoice ?? null,
      receiverId: body.receiverId ?? null,
      statusNote: body.statusNote ?? null,
      recurringId: null,
      reviewStatus: status,
    }

    if (split != null) {
      assertSplittable(account, body.type)
    }

    if (installments !== undefined && installments.count > 1) {
      const { amount, ...purchase } = write

      return this.installments.create(
        tenantId,
        userId,
        account,
        purchase,
        amount,
        installments,
        split
      )
    }

    return this.repository.insertWithBalance(tenantId, userId, {
      ...write,
      ...(split == null
        ? {}
        : { splits: sharesOf(body.amount, split, payer) }),
    })
  }

  /** Rejects (400) a payer or a split naming someone who is not an active
   * member of the household. */
  private async assertPayerAndSplit(
    tenantId: number,
    payerUserId: number | null | undefined,
    split: SplitInput | null | undefined
  ): Promise<void> {
    if (payerUserId == null && split == null) {
      return
    }

    assertMembers(
      await this.members.activeMemberIds(tenantId),
      payerUserId,
      split
    )
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

  /**
   * A row on or before its account's `reconciledThrough` was matched to the
   * bank: changing it answers 409 with the lock date until the caller
   * confirms.
   */
  private async assertNotReconciled(
    tenantId: number,
    row: TransactionRow,
    confirmed: boolean | undefined
  ): Promise<void> {
    if (!row.locked || confirmed === true) {
      return
    }

    const account = await this.accounts.findById(tenantId, row.linkedAccountId)
    const conflict: ReconciledEditConflict = {
      message:
        'This transaction was reconciled with the bank. Confirm to change it.',
      reconciledThrough: account?.reconciledThrough ?? row.transactionDt,
    }

    throw new ConflictException(conflict)
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

    // A transfer side's type and account are what pair it with its sibling:
    // the sibling only mirrors amount, day, category, note, and status, so
    // flipping one side's type or moving it to another account would create
    // or destroy money across the pair.
    if (
      row.transferGroupId !== null &&
      (body.type !== row.type || body.linkedAccountId !== row.linkedAccountId)
    ) {
      throw new ConflictException(
        "A transfer's type and account cannot be changed."
      )
    }

    // A settlement moves a debt between two members: it is deleted and
    // recorded again, never edited into a different one.
    if (row.isSettlement) {
      throw new ConflictException(
        'A settlement cannot be edited. Delete it and settle up again.'
      )
    }

    await this.assertNotReconciled(tenantId, row, body.confirmReconciled)

    if (row.installmentGroupId !== null) {
      await this.assertInstallmentEdit(tenantId, row, body)
    }

    const account = await this.assertReferencesUsable(tenantId, body)

    await this.assertPayerAndSplit(tenantId, body.paidByUserId, body.split)

    // The row's new day and account count too: moving an open row into a
    // reconciled period is as much a change to it as editing a locked one.
    assertDateOpen(account, body.transactionDt, body.confirmReconciled)

    // A transaction has no currency of its own — it carries its account's.
    // Moving it to an account of another currency would keep the digits and
    // silently change the money (R$ 500 becoming US$ 500). Converting is out
    // of scope: it would need an exchange rate stored on the transaction.
    if (account.currency !== row.currency) {
      throw new ConflictException(
        'Move the transaction to an account of the same currency.'
      )
    }

    // As in create: the wire's `status` names out before the spread.
    const {
      status,
      id: _updateId,
      confirmReconciled: _confirm,
      split,
      paidByUserId,
      ...rest
    } = body
    const payer = paidByUserId ?? row.paidByUserId
    const splits = this.splitsForUpdate(row, account, body, split, payer)

    const updated = await this.repository.updateWithBalance(
      tenantId,
      body.id,
      userId,
      {
        ...rest,
        // Left out, the stored payer and shares are kept.
        ...(paidByUserId == null ? {} : { paidByUserId }),
        ...(splits === undefined ? {} : { splits }),
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
   * The shares an edit stores. A new split replaces them (and only an
   * expense of the household's own, entered by hand, takes one); `null`
   * clears them; left out, the shares follow the amount — each member keeps
   * their proportion — and an income or a shared account carries none.
   * `undefined` means "leave the stored shares alone".
   */
  private splitsForUpdate(
    row: TransactionRow,
    account: Account,
    body: UpdateTransactionBody,
    split: SplitInput | null | undefined,
    payer: number | null
  ): SplitShare[] | undefined {
    if (split === null) {
      return []
    }

    if (split !== undefined) {
      if (row.transferGroupId !== null) {
        throw new ConflictException(
          'Transfers and bill payments cannot be split.'
        )
      }

      if (row.installmentGroupId !== null) {
        throw new ConflictException(
          'Edit the whole purchase to change how it is split.'
        )
      }

      assertSplittable(account, body.type)

      return sharesOf(body.amount, split, payer)
    }

    if (row.splits.length === 0) {
      return undefined
    }

    if (body.type !== 'Expense' || account.ownership === 'shared') {
      return []
    }

    return toCents(body.amount) === toCents(row.amount)
      ? undefined
      : inheritShares(
          row.splits.map((entry) => ({
            userId: entry.userId,
            share: entry.share,
          })),
          body.amount,
          payer
        )
  }

  /**
   * Records a settle-up between two members: `fromUserId` pays `toUserId`.
   * With both accounts it is a transfer between them (the same path as any
   * transfer, flagged as a settlement); with only the paying account it is
   * an Expense on it with the receiving member as receiver. Either way the
   * rows stay out of income and expense reports and move the pair's
   * balance by exactly the amount. A removed member can still be settled.
   */
  async settle(
    tenantId: number,
    userId: number,
    body: SettleUpBody
  ): Promise<TransactionRow[]> {
    const memberIds = await this.members.allMemberIds(tenantId)

    if (
      !memberIds.includes(body.fromUserId) ||
      !memberIds.includes(body.toUserId)
    ) {
      throw new BadRequestException('Settle up between members only.')
    }

    const from = await this.usableSettleAccount(
      tenantId,
      body.fromAccountId,
      body.currency
    )
    const category = await this.categories.getOrCreateByName(
      tenantId,
      userId,
      SETTLEMENT_CATEGORY
    )
    const settlement = { fromUserId: body.fromUserId, toUserId: body.toUserId }

    if (body.toAccountId != null) {
      const to = await this.usableSettleAccount(
        tenantId,
        body.toAccountId,
        body.currency
      )

      if (to.id === from.id) {
        throw new ConflictException('Pick two different accounts.')
      }

      const rows = await this.repository.insertTransfer(tenantId, userId, {
        amount: body.amount,
        transactionDt: body.transactionDt,
        categoryId: category.id,
        fromAccountId: from.id,
        toAccountId: to.id,
        note: body.note ?? null,
        paymentStatementId: null,
        settlement,
      })

      return rows ?? []
    }

    // The receiving member's account is not one the payer can use: the
    // payment leaves the paying account as an expense to the member.
    const receiverName = await this.members.nameOf(tenantId, body.toUserId)
    const receiver = await this.receivers.getOrCreatePerson(
      tenantId,
      userId,
      receiverName ?? 'Member'
    )

    return [
      await this.repository.insertWithBalance(tenantId, userId, {
        name: 'SETTLEMENT',
        note: body.note ?? null,
        invoice: 'SETTLEMENT',
        amount: body.amount,
        transactionDt: body.transactionDt,
        linkedAccountId: from.id,
        categoryId: category.id,
        receiverId: receiver.id,
        recurringId: null,
        type: 'Expense',
        reviewStatus: 'Verify',
        statusNote: null,
        paidByUserId: body.fromUserId,
        isSettlement: true,
        splits: [{ userId: body.toUserId, share: body.amount }],
      }),
    ]
  }

  /** An ACTIVE account in the settlement's currency that is not a card
   * (paying a card is a bill payment, not a settle-up). */
  private async usableSettleAccount(
    tenantId: number,
    accountId: number,
    currency: Account['currency']
  ): Promise<Account> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${accountId}.`)
    }

    if (account.type === 'Credit Card') {
      throw new ConflictException('A settle-up cannot use a credit card.')
    }

    if (account.currency !== currency) {
      throw new ConflictException(
        `Pick an account in ${currency}: settlements are not converted.`
      )
    }

    return account
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

    await this.assertNotReconciled(tenantId, row, body.confirmReconciled)

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

  /**
   * Moves a card charge to another bill of the same card and pins it there,
   * or re-points the bill the card side of a payment settles. Only a row on
   * a card can move — a charge on its bill, or a payment — and only to an
   * ACTIVE bill of its own card.
   */
  async moveToStatement(
    tenantId: number,
    userId: number,
    id: number,
    body: MoveToStatementBody
  ): Promise<TransactionRow> {
    const row = await this.find(tenantId, id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No transaction with id ${id}.`)
    }

    const payment = row.type === 'Income' && row.transferGroupId !== null

    if (row.statementId === null && !payment) {
      throw new ConflictException('Only a card charge is on a bill.')
    }

    const statement = await this.statements.findById(tenantId, body.statementId)

    if (statement === undefined || statement.status === 'DELETED') {
      throw new NotFoundException(`No bill with id ${body.statementId}.`)
    }

    if (statement.accountId !== row.linkedAccountId) {
      throw new ConflictException('Pick a bill of the same card.')
    }

    const moved = await this.repository.moveToStatement(
      tenantId,
      id,
      userId,
      body.statementId
    )

    if (moved === undefined) {
      throw new NotFoundException(`No transaction with id ${id}.`)
    }

    return moved
  }

  /** Soft-deletes a transaction: its delta is reverted from the account in
   * the same database transaction that marks the row DELETED. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number,
    confirmReconciled = false
  ): Promise<void> {
    const row = await this.find(tenantId, id)

    if (row.status === 'DELETED') {
      return
    }

    await this.assertNotReconciled(tenantId, row, confirmReconciled)

    if (row.installmentGroupId !== null) {
      throw new ConflictException(
        "Delete an installment purchase as a whole, or its remaining installments."
      )
    }

    await this.repository.softDeleteWithBalance(tenantId, id, userId)
  }

  /**
   * Transfers money between two accounts: two transactions in one database
   * transaction — an Expense on the source and an Income on the
   * destination. Both accounts must be ACTIVE and share a currency.
   *
   * A transfer into a credit card pays a bill of that card: the one the
   * body names, or the card's default (its oldest unpaid closed bill, else
   * the open one). A payment with no category lands in the tenant's
   * "Credit card payment" category, created the first time.
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

    const paysCard = to.type === 'Credit Card'

    if (body.paymentStatementId !== undefined && !paysCard) {
      throw new ConflictException('Only a transfer into a card pays a bill.')
    }

    const categoryId = await this.transferCategoryId(
      tenantId,
      userId,
      body.categoryId,
      paysCard
    )
    const paymentStatementId = paysCard
      ? await this.paymentStatementId(tenantId, userId, to.id, body)
      : null

    const rows = await this.repository.insertTransfer(tenantId, userId, {
      amount: body.amount,
      transactionDt: body.transactionDt,
      categoryId,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      note: body.note ?? null,
      paymentStatementId,
    })

    if (rows === undefined) {
      throw new NotFoundException(`No bill with id ${paymentStatementId}.`)
    }

    return rows
  }

  /** The category a transfer lands in: the one named, which must be
   * usable, or — on a bill payment only — the card payment category. */
  private async transferCategoryId(
    tenantId: number,
    userId: number,
    categoryId: number | undefined,
    paysCard: boolean
  ): Promise<number> {
    if (categoryId === undefined) {
      if (!paysCard) {
        throw new BadRequestException('Pick a category.')
      }

      const category = await this.categories.getOrCreateByName(
        tenantId,
        userId,
        CARD_PAYMENT_CATEGORY
      )

      return category.id
    }

    const category = await this.categories.findById(tenantId, categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundException(`No category with id ${categoryId}.`)
    }

    return categoryId
  }

  /** The bill a payment into a card settles: the one named, which must be
   * an ACTIVE bill of that card, or the card's default. */
  private async paymentStatementId(
    tenantId: number,
    userId: number,
    cardId: number,
    body: TransferBody
  ): Promise<number | null> {
    if (body.paymentStatementId === undefined) {
      return this.statements.defaultPaymentStatementId(tenantId, userId, cardId)
    }

    const statement = await this.statements.findById(
      tenantId,
      body.paymentStatementId
    )

    if (statement === undefined || statement.status === 'DELETED') {
      throw new NotFoundException(`No bill with id ${body.paymentStatementId}.`)
    }

    if (statement.accountId !== cardId) {
      throw new ConflictException('Pick a bill of the card being paid.')
    }

    return statement.id
  }

  /**
   * Rejects a row edit of one installment beyond what it may change on its
   * own — its amount, category, note, and review status (a bank
   * adjustment) — or once its bill is no longer Open: the bank billed it.
   */
  private async assertInstallmentEdit(
    tenantId: number,
    row: TransactionRow,
    body: UpdateTransactionBody
  ): Promise<void> {
    if (
      body.name !== row.name ||
      body.transactionDt !== row.transactionDt ||
      body.linkedAccountId !== row.linkedAccountId ||
      body.type !== row.type ||
      (body.receiverId ?? null) !== row.receiverId ||
      (body.invoice ?? null) !== row.invoice
    ) {
      throw new ConflictException(
        'Edit the whole purchase to change its name, day, account, or receiver.'
      )
    }

    const statement =
      row.statementId === null
        ? undefined
        : await this.statements.findById(tenantId, row.statementId)
    const today = await this.statements.todayOf(tenantId)

    if (statement !== undefined && statement.closeDate <= today) {
      throw new ConflictException(
        'This installment was already billed and can no longer change.'
      )
    }
  }

  /** Rejects an account, category, or — when set — receiver the tenant
   * cannot use, and answers the account. */
  private async assertReferencesUsable(
    tenantId: number,
    body: CreateTransactionBody | UpdateTransactionBody
  ): Promise<Account> {
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

    return account
  }
}
