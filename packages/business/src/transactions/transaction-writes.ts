import type {
  CreditCardStatementRepository,
  Transaction,
  TransactionRepository,
  TransactionRow,
  TransactionWrite,
} from '@workspace/db'
import type { TransactionStatus } from '@workspace/dto'

import { isClosedTarget } from '../credit-card-statements/statement-placer.js'
import type { TenantToday } from '../settings/tenant-today.js'
import { isPaymentRow } from './transaction-ledger.js'
import {
  plannedDeletes,
  plannedStatusFlips,
  type TransactionPlanner,
  type TransferWrite,
  withClosedWarning,
} from './transaction-planner.js'

export class TransactionWrites {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly planner: Pick<
      TransactionPlanner,
      'insert' | 'update' | 'transferLegs'
    >,
    private readonly statements: Pick<
      CreditCardStatementRepository,
      'findActive'
    >,
    private readonly today: Pick<TenantToday, 'of'>
  ) {}

  async insert(
    tenantId: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow> {
    const planned = await this.planner.insert(tenantId, userId, write)
    const row = await this.repository.insert(tenantId, userId, planned)

    return withClosedWarning(row, isClosedTarget(planned.target))
  }

  async insertGenerated(
    tenantId: number,
    write: TransactionWrite
  ): Promise<TransactionRow | undefined> {
    const planned = await this.planner.insert(tenantId, null, write)
    const row = await this.repository.insertGenerated(tenantId, planned)

    return row === undefined
      ? undefined
      : withClosedWarning(row, isClosedTarget(planned.target))
  }

  async update(
    tenantId: number,
    id: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow | undefined> {
    const before = await this.activeRow(tenantId, id)

    if (before === undefined) {
      return undefined
    }

    const sibling = await this.repository.findActiveSibling(tenantId, before)
    const planned = await this.planner.update(tenantId, before, write, sibling)
    const row = await this.repository.update(tenantId, userId, before, planned)

    return row === undefined
      ? undefined
      : withClosedWarning(row, isClosedTarget(planned.target))
  }

  async changeStatus(
    tenantId: number,
    id: number,
    userId: number,
    reviewStatus: TransactionStatus
  ): Promise<TransactionRow | undefined> {
    const before = await this.activeRow(tenantId, id)

    if (before === undefined) {
      return undefined
    }

    await this.repository.updateStatuses(
      tenantId,
      userId,
      plannedStatusFlips(await this.withSibling(tenantId, before), reviewStatus)
    )

    return this.repository.findById(tenantId, id)
  }

  async moveToStatement(
    tenantId: number,
    id: number,
    userId: number,
    statementId: number
  ): Promise<TransactionRow | undefined> {
    const row = await this.activeRow(tenantId, id)

    if (row === undefined) {
      return undefined
    }

    const statement = await this.statements.findActive(tenantId, statementId)

    if (statement === undefined || statement.accountId !== row.linkedAccountId) {
      return undefined
    }

    const payment = isPaymentRow(row)
    const closed = statement.closeDate <= (await this.today.of(tenantId))
    const moved = await this.repository.moveToStatement(
      tenantId,
      userId,
      row,
      payment
        ? { paymentStatementId: statementId }
        : { statementId, statementPinned: true },
      closed ? statementId : null
    )

    return payment ? moved : withClosedWarning(moved, closed)
  }

  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Transaction | undefined> {
    const before = await this.repository.findById(tenantId, id)

    if (before === undefined || before.status === 'DELETED') {
      return before
    }

    await this.repository.softDelete(
      tenantId,
      userId,
      plannedDeletes(await this.withSibling(tenantId, before))
    )

    return this.repository.findById(tenantId, id)
  }

  async transfer(
    tenantId: number,
    userId: number,
    write: TransferWrite
  ): Promise<[TransactionRow, TransactionRow] | undefined> {
    let closedStatementId: number | null = null

    if (write.paymentStatementId !== null) {
      const statement = await this.statements.findActive(
        tenantId,
        write.paymentStatementId
      )

      if (statement === undefined || statement.accountId !== write.toAccountId) {
        return undefined
      }

      if (statement.closeDate <= (await this.today.of(tenantId))) {
        closedStatementId = statement.id
      }
    }

    return this.repository.insertTransfer(
      tenantId,
      userId,
      await this.planner.transferLegs(tenantId, userId, write),
      closedStatementId
    )
  }

  private async activeRow(
    tenantId: number,
    id: number
  ): Promise<TransactionRow | undefined> {
    const row = await this.repository.findById(tenantId, id)

    return row === undefined || row.status === 'DELETED' ? undefined : row
  }

  private async withSibling(
    tenantId: number,
    row: Transaction
  ): Promise<Transaction[]> {
    const sibling = await this.repository.findActiveSibling(tenantId, row)

    return sibling === undefined ? [row] : [row, sibling]
  }
}
