import {
  type GroupMeta,
  type InstallmentRepository,
  type InstallmentState,
  LedgerBatchPlan,
  type Transaction,
  type TransactionRepository,
  type TransactionRow,
  type TransactionWrite,
} from '@workspace/db'
import type { SplitShare } from '@workspace/dto'

import { sumMoney } from '../calc/money.js'
import { divideGroupShares, inheritShares } from '../calc/splits.js'
import { isOpenInstallment, planGroupEdit } from './installment-plan.js'
import { revertDeltaFor, shiftDeltaFor } from './transaction-ledger.js'
import type { TransactionPlanner } from './transaction-planner.js'

export type PurchaseWrite = Omit<
  TransactionWrite,
  'amount' | 'installment' | 'splits'
> & { groupShares?: SplitShare[] }

export type GroupOutcome<T> =
  | { kind: 'done'; value: T }
  | { kind: 'missing' }
  | { kind: 'billed' }

export interface GroupSplitChange {
  shares: SplitShare[] | null
}

interface OpenGroup {
  rows: Transaction[]
  states: InstallmentState[]
  allOpen: boolean
  today: string
}

type GroupTransactions = Pick<
  TransactionRepository,
  | 'findInstallments'
  | 'planInsert'
  | 'planSoftDelete'
  | 'planReplaceSplits'
  | 'readInsertedRow'
  | 'run'
>

export class InstallmentGroups {
  constructor(
    private readonly repository: InstallmentRepository,
    private readonly transactions: GroupTransactions,
    private readonly planner: Pick<TransactionPlanner, 'insert'>
  ) {}

  async find(
    tenantId: number,
    groupId: string,
    today: string
  ): Promise<{ rows: TransactionRow[]; allOpen: boolean } | undefined> {
    const rows = await this.transactions.findInstallments(tenantId, groupId)

    if (rows.length === 0) {
      return undefined
    }

    const states = await this.repository.statesOf(tenantId, rows)

    return {
      rows,
      allOpen: states.every((state) => isOpenInstallment(state, today)),
    }
  }

  async create(
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[]
  ): Promise<TransactionRow[]> {
    const groupId = crypto.randomUUID()

    await this.transactions.run(
      await this.planParts(tenantId, userId, purchase, parts, groupId)
    )

    return this.transactions.findInstallments(tenantId, groupId)
  }

  async update(
    tenantId: number,
    userId: number,
    groupId: string,
    meta: GroupMeta,
    parts: readonly string[],
    today: string,
    splitChange?: GroupSplitChange
  ): Promise<GroupOutcome<TransactionRow[]>> {
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    const [first] = group.rows
    const stored = await this.groupSharesOf(tenantId, group.rows)
    const groupShares =
      splitChange === undefined ? stored : (splitChange.shares ?? undefined)
    const payer = meta.paidByUserId ?? first.paidByUserId
    const edit = planGroupEdit(
      group.states,
      first.installmentCount ?? group.rows.length,
      parts
    )

    if (edit !== 'meta' && !group.allOpen) {
      return { kind: 'billed' }
    }

    if (edit === 'resplit') {
      const plan = this.planDeletes(tenantId, userId, group.rows)

      plan.append(
        await this.planParts(
          tenantId,
          userId,
          { ...purchaseOf(first, groupShares), ...meta },
          parts,
          groupId
        )
      )

      await this.transactions.run(plan)
    } else {
      const amounts =
        edit === 'amounts' ? parts : group.rows.map((row) => row.amount)
      const divided =
        groupShares === undefined
          ? undefined
          : divideGroupShares(groupShares, amounts, payer)
      const plan = new LedgerBatchPlan()

      for (const [index, row] of group.rows.entries()) {
        const amount = amounts[index]

        plan.append(
          this.repository.planRewrite(
            tenantId,
            userId,
            row,
            { ...meta, amount },
            shiftDeltaFor(row, { ...row, amount })
          )
        )

        if (
          splitChange !== undefined ||
          edit === 'amounts' ||
          amount !== row.amount
        ) {
          plan.append(
            this.transactions.planReplaceSplits(
              tenantId,
              userId,
              row.id,
              divided === undefined ? [] : (divided[index] ?? [])
            )
          )
        }
      }

      await this.transactions.run(plan)
    }

    return {
      kind: 'done',
      value: await this.transactions.findInstallments(tenantId, groupId),
    }
  }

  async delete(
    tenantId: number,
    userId: number,
    groupId: string,
    scope: 'all' | 'remaining',
    today: string
  ): Promise<GroupOutcome<number>> {
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    if (scope === 'all' && !group.allOpen) {
      return { kind: 'billed' }
    }

    const open = openRows(group)

    await this.transactions.run(this.planDeletes(tenantId, userId, open))

    return { kind: 'done', value: open.length }
  }

  async refund(
    tenantId: number,
    userId: number,
    groupId: string,
    name: string,
    today: string
  ): Promise<GroupOutcome<TransactionRow | null>> {
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    const open = openRows(group)
    const deleted = new Set(open.map((row) => row.id))
    const plan = this.planDeletes(tenantId, userId, open)
    const billed = group.rows.filter(
      (row) => !deleted.has(row.id) && row.reviewStatus !== 'Canceled'
    )

    if (billed.length === 0) {
      await this.transactions.run(plan)

      return { kind: 'done', value: null }
    }

    const [first] = group.rows
    const refund = await this.transactions.planInsert(
      tenantId,
      userId,
      await this.planner.insert(tenantId, userId, {
        ...purchaseOf(first),
        name,
        type: 'Income',
        reviewStatus: 'Verify',
        statusNote: null,
        transactionDt: today,
        amount: sumMoney(billed.map((row) => row.amount)),
      })
    )
    const base = plan.size

    plan.append(refund.plan)

    const results = await this.transactions.run(plan)

    return {
      kind: 'done',
      value: await this.transactions.readInsertedRow(
        tenantId,
        results,
        base + refund.insertIndex
      ),
    }
  }

  async convert(
    tenantId: number,
    userId: number,
    id: number,
    parts: readonly string[],
    today: string
  ): Promise<GroupOutcome<TransactionRow[]>> {
    const row = await this.repository.findActiveRow(tenantId, id)

    if (row === undefined || row.installmentGroupId !== null) {
      return { kind: 'missing' }
    }

    const [state] = await this.repository.statesOf(tenantId, [row])

    if (!isOpenInstallment(state, today)) {
      return { kind: 'billed' }
    }

    const shares = await this.groupSharesOf(tenantId, [row])
    const groupId = crypto.randomUUID()
    const plan = this.planDeletes(tenantId, userId, [row])

    plan.append(
      await this.planParts(
        tenantId,
        userId,
        purchaseOf(row, shares),
        parts,
        groupId
      )
    )

    await this.transactions.run(plan)

    return {
      kind: 'done',
      value: await this.transactions.findInstallments(tenantId, groupId),
    }
  }

  async collapse(
    tenantId: number,
    userId: number,
    groupId: string,
    today: string
  ): Promise<GroupOutcome<TransactionRow>> {
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    if (!group.allOpen) {
      return { kind: 'billed' }
    }

    const shares = await this.groupSharesOf(tenantId, group.rows)
    const plan = this.planDeletes(tenantId, userId, group.rows)
    const [first] = group.rows
    const { groupShares, ...purchase } = purchaseOf(first, shares)
    const amount = sumMoney(group.rows.map((row) => row.amount))
    const collapsed = await this.transactions.planInsert(
      tenantId,
      userId,
      await this.planner.insert(tenantId, userId, {
        ...purchase,
        amount,
        ...(groupShares === undefined
          ? {}
          : {
              splits: inheritShares(
                groupShares,
                amount,
                purchase.paidByUserId ?? null
              ),
            }),
      })
    )
    const base = plan.size

    plan.append(collapsed.plan)

    const results = await this.transactions.run(plan)

    return {
      kind: 'done',
      value: await this.transactions.readInsertedRow(
        tenantId,
        results,
        base + collapsed.insertIndex
      ),
    }
  }

  private async planParts(
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[],
    groupId: string
  ): Promise<LedgerBatchPlan> {
    const { groupShares, ...columns } = purchase
    const divided =
      groupShares === undefined
        ? undefined
        : divideGroupShares(groupShares, parts, columns.paidByUserId ?? null)
    const plan = new LedgerBatchPlan()

    for (const [index, amount] of parts.entries()) {
      const planned = await this.planner.insert(tenantId, userId, {
        ...columns,
        amount,
        ...(divided === undefined ? {} : { splits: divided[index] }),
        installment: { groupId, number: index + 1, count: parts.length },
      })

      plan.append(
        (await this.transactions.planInsert(tenantId, userId, planned)).plan
      )
    }

    return plan
  }

  private planDeletes(
    tenantId: number,
    userId: number,
    rows: readonly Transaction[]
  ): LedgerBatchPlan {
    const plan = new LedgerBatchPlan()

    for (const row of rows) {
      plan.append(
        this.transactions.planSoftDelete(
          tenantId,
          userId,
          row,
          revertDeltaFor(row)
        )
      )
    }

    return plan
  }

  private async readGroup(
    tenantId: number,
    groupId: string,
    today: string
  ): Promise<OpenGroup | undefined> {
    const group = await this.repository.readGroup(tenantId, groupId)

    if (group === undefined) {
      return undefined
    }

    return {
      ...group,
      allOpen: group.states.every((state) => isOpenInstallment(state, today)),
      today,
    }
  }

  private async groupSharesOf(
    tenantId: number,
    rows: readonly Transaction[]
  ): Promise<SplitShare[] | undefined> {
    const shares = await this.repository.sharesTotalOf(tenantId, rows)

    return shares.length === 0 ? undefined : shares
  }
}

function openRows(group: OpenGroup): Transaction[] {
  const open = new Set(
    group.states
      .filter((state) => isOpenInstallment(state, group.today))
      .map((state) => state.id)
  )

  return group.rows.filter((row) => open.has(row.id))
}

function purchaseOf(row: Transaction, groupShares?: SplitShare[]): PurchaseWrite {
  return {
    ...(groupShares === undefined ? {} : { groupShares }),
    paidByUserId: row.paidByUserId,
    name: row.name,
    note: row.note,
    invoice: row.invoice,
    transactionDt: row.transactionDt,
    linkedAccountId: row.linkedAccountId,
    categoryId: row.categoryId,
    receiverId: row.receiverId,
    recurringId: null,
    type: row.type,
    reviewStatus: row.reviewStatus,
    statusNote: row.statusNote,
  }
}
