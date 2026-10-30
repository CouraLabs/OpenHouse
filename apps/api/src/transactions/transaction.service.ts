import type { Account } from '@workspace/db'
import {
  CARD_PAYMENT_CATEGORY,
  TRANSFER_CATEGORY,
  inheritShares,
  resolveSplit,
  FREE_TIER,
  SETTLEMENT_CATEGORY,
  TIER_LIMIT,
  toCents,
  type TierLimitError,
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
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../common/errors.js'
import type { TierGate } from '../common/tiers/tier-gate.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { assertMembers } from './split-members.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { InstallmentService } from './installment.service.js'
import {
  TransactionRepository,
  type TransactionRow,
  type TransactionSearch,
} from './transaction.repository.js'

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
    message: 'This day was reconciled with the bank. Confirm to change it.',
    reconciledThrough: account.reconciledThrough,
  }

  throw new ConflictError(conflict)
}

function assertSplittable(account: Account, type: string): void {
  if (type !== 'Expense') {
    throw new BadRequestError('Only an expense can be split.')
  }

  if (account.ownership === 'shared') {
    throw new ConflictError('Expenses from a shared account create no debts.')
  }
}

function sharesOf(
  amount: string,
  split: SplitInput,
  payerUserId: number | null
): SplitShare[] {
  const resolved = resolveSplit(amount, split, payerUserId)

  if (!resolved.ok) {
    throw new BadRequestError(resolved.message)
  }

  return resolved.shares
}

export class TransactionService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly statements: CreditCardStatementRepository,
    private readonly installments: InstallmentService,
    private readonly members: HouseholdMembers,
    private readonly tiers: TierGate
  ) {}

  private async assertInWindow(tenantId: number, day: string): Promise<void> {
    const start = await this.tiers.transactionWindowStart(tenantId)

    if (start !== null && day < start) {
      throw new ForbiddenError({
        message: `Your plan keeps transactions from ${start} on. Upgrade your plan to record older ones.`,
        error: 'Forbidden',
        statusCode: 403,
        code: TIER_LIMIT,
        limit: 'transaction_window',
        tier: FREE_TIER,
      } satisfies TierLimitError)
    }
  }

  private async inWindow<Filter extends TransactionFilter>(
    tenantId: number,
    filter: Filter
  ): Promise<Filter> {
    const start = await this.tiers.transactionWindowStart(tenantId)

    if (
      start === null ||
      (filter.transactionDtFrom !== undefined &&
        filter.transactionDtFrom >= start)
    ) {
      return filter
    }

    return { ...filter, transactionDtFrom: start }
  }

  async create(
    tenantId: number,
    userId: number,
    body: CreateTransactionBody
  ): Promise<TransactionRow> {
    await this.assertInWindow(tenantId, body.transactionDt)

    const account = await this.assertReferencesUsable(tenantId, body)

    assertDateOpen(account, body.transactionDt, body.confirmReconciled)

    await this.assertPayerAndSplit(tenantId, body.paidByUserId, body.split)

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
      ...(split == null ? {} : { splits: sharesOf(body.amount, split, payer) }),
    })
  }

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

  async search(
    tenantId: number,
    args: SearchTransactionsArgs
  ): Promise<TransactionSearch> {
    return this.repository.search(tenantId, {
      ...args,
      filter: await this.inWindow(tenantId, args.filter),
    })
  }

  async summary(tenantId: number, filter: TransactionFilter) {
    return this.repository.summary(
      tenantId,
      await this.inWindow(tenantId, filter)
    )
  }

  async breakdown(tenantId: number, args: TransactionBreakdownArgs) {
    const filter = await this.inWindow(tenantId, args)

    return this.repository.breakdown(tenantId, args.dimension, filter)
  }

  async find(tenantId: number, id: number): Promise<TransactionRow> {
    const row = await this.repository.findById(tenantId, id)
    const start = await this.tiers.transactionWindowStart(tenantId)

    if (row === undefined || (start !== null && row.transactionDt < start)) {
      throw new NotFoundError(`No transaction with id ${id}.`)
    }

    return row
  }

  async findHistory(tenantId: number, id: number) {
    await this.find(tenantId, id)

    return this.repository.findHistory(tenantId, id)
  }

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

    throw new ConflictError(conflict)
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateTransactionBody
  ): Promise<TransactionRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No transaction with id ${body.id}.`)
    }

    if (
      row.transferGroupId !== null &&
      (body.type !== row.type || body.linkedAccountId !== row.linkedAccountId)
    ) {
      throw new ConflictError(
        "A transfer's type and account cannot be changed."
      )
    }

    if (row.isSettlement) {
      throw new ConflictError(
        'A settlement cannot be edited. Delete it and settle up again.'
      )
    }

    await this.assertNotReconciled(tenantId, row, body.confirmReconciled)

    if (row.installmentGroupId !== null) {
      await this.assertInstallmentEdit(tenantId, row, body)
    }

    await this.assertInWindow(tenantId, body.transactionDt)

    const account = await this.assertReferencesUsable(tenantId, body)

    await this.assertPayerAndSplit(tenantId, body.paidByUserId, body.split)

    assertDateOpen(account, body.transactionDt, body.confirmReconciled)

    if (account.currency !== row.currency) {
      throw new ConflictError(
        'Move the transaction to an account of the same currency.'
      )
    }

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
      throw new NotFoundError(`No transaction with id ${body.id}.`)
    }

    return updated
  }

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
        throw new ConflictError('Transfers and bill payments cannot be split.')
      }

      if (row.installmentGroupId !== null) {
        throw new ConflictError(
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

  async settle(
    tenantId: number,
    userId: number,
    body: SettleUpBody
  ): Promise<TransactionRow[]> {
    await this.assertInWindow(tenantId, body.transactionDt)

    const memberIds = await this.members.allMemberIds(tenantId)

    if (
      !memberIds.includes(body.fromUserId) ||
      !memberIds.includes(body.toUserId)
    ) {
      throw new BadRequestError('Settle up between members only.')
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
        throw new ConflictError('Pick two different accounts.')
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

  private async usableSettleAccount(
    tenantId: number,
    accountId: number,
    currency: Account['currency']
  ): Promise<Account> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${accountId}.`)
    }

    if (account.type === 'Credit Card') {
      throw new ConflictError('A settle-up cannot use a credit card.')
    }

    if (account.currency !== currency) {
      throw new ConflictError(
        `Pick an account in ${currency}: settlements are not converted.`
      )
    }

    return account
  }

  async changeStatus(
    tenantId: number,
    userId: number,
    body: ChangeTransactionStatusBody
  ): Promise<TransactionRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No transaction with id ${body.id}.`)
    }

    await this.assertNotReconciled(tenantId, row, body.confirmReconciled)

    const updated = await this.repository.updateStatus(
      tenantId,
      body.id,
      userId,
      body.status
    )

    if (updated === undefined) {
      throw new NotFoundError(`No transaction with id ${body.id}.`)
    }

    return updated
  }

  async moveToStatement(
    tenantId: number,
    userId: number,
    id: number,
    body: MoveToStatementBody
  ): Promise<TransactionRow> {
    const row = await this.find(tenantId, id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No transaction with id ${id}.`)
    }

    const payment = row.type === 'Income' && row.transferGroupId !== null

    if (row.statementId === null && !payment) {
      throw new ConflictError('Only a card charge is on a bill.')
    }

    const statement = await this.statements.findById(tenantId, body.statementId)

    if (statement === undefined || statement.status === 'DELETED') {
      throw new NotFoundError(`No bill with id ${body.statementId}.`)
    }

    if (statement.accountId !== row.linkedAccountId) {
      throw new ConflictError('Pick a bill of the same card.')
    }

    const moved = await this.repository.moveToStatement(
      tenantId,
      id,
      userId,
      body.statementId
    )

    if (moved === undefined) {
      throw new NotFoundError(`No transaction with id ${id}.`)
    }

    return moved
  }

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
      throw new ConflictError(
        'Delete an installment purchase as a whole, or its remaining installments.'
      )
    }

    await this.repository.softDeleteWithBalance(tenantId, id, userId)
  }

  async transfer(
    tenantId: number,
    userId: number,
    body: TransferBody
  ): Promise<[TransactionRow, TransactionRow]> {
    const from = await this.accounts.findById(tenantId, body.fromAccountId)

    if (from === undefined || from.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${body.fromAccountId}.`)
    }

    const to = await this.accounts.findById(tenantId, body.toAccountId)

    if (to === undefined || to.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${body.toAccountId}.`)
    }

    if (from.id === to.id) {
      throw new ConflictError('Pick two different accounts.')
    }

    await this.assertInWindow(tenantId, body.transactionDt)

    if (from.currency !== to.currency) {
      throw new ConflictError(
        'Transfer needs two accounts of the same currency.'
      )
    }

    const paysCard = to.type === 'Credit Card'

    if (body.paymentStatementId !== undefined && !paysCard) {
      throw new ConflictError('Only a transfer into a card pays a bill.')
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
      throw new NotFoundError(`No bill with id ${paymentStatementId}.`)
    }

    return rows
  }

  private async transferCategoryId(
    tenantId: number,
    userId: number,
    categoryId: number | undefined,
    paysCard: boolean
  ): Promise<number> {
    if (categoryId === undefined) {
      const category = await this.categories.getOrCreateByName(
        tenantId,
        userId,
        paysCard ? CARD_PAYMENT_CATEGORY : TRANSFER_CATEGORY
      )

      return category.id
    }

    const category = await this.categories.findById(tenantId, categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundError(`No category with id ${categoryId}.`)
    }

    return categoryId
  }

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
      throw new NotFoundError(`No bill with id ${body.paymentStatementId}.`)
    }

    if (statement.accountId !== cardId) {
      throw new ConflictError('Pick a bill of the card being paid.')
    }

    return statement.id
  }

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
      throw new ConflictError(
        'Edit the whole purchase to change its name, day, account, or receiver.'
      )
    }

    const statement =
      row.statementId === null
        ? undefined
        : await this.statements.findById(tenantId, row.statementId)
    const today = await this.statements.todayOf(tenantId)

    if (statement !== undefined && statement.closeDate <= today) {
      throw new ConflictError(
        'This installment was already billed and can no longer change.'
      )
    }
  }

  private async assertReferencesUsable(
    tenantId: number,
    body: CreateTransactionBody | UpdateTransactionBody
  ): Promise<Account> {
    const account = await this.accounts.findById(tenantId, body.linkedAccountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${body.linkedAccountId}.`)
    }

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

    return account
  }
}
