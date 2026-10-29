import { randomUUID } from 'node:crypto'
import type { Account, Database } from '@workspace/db'
import {
  cardCycleOf,
  IMPORT_CHUNK_SIZE,
  IMPORT_UNDO_HOURS,
  type ImportBatch,
  type ImportCommitBody,
  type ImportCommitRow,
  type ImportResult,
  type ImportUndoResult,
  type ReconciledEditConflict,
} from '@workspace/poco'

import { LedgerBatchPlan } from '../common/ledger/ledger-batch.js'
import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ConflictError, NotFoundError } from '../common/errors.js'
import { Clock } from '../common/clock/clock.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  TransactionRepository,
  type TransactionWrite,
} from '../transactions/transaction.repository.js'
import { chunk } from './chunk.js'
import { ImportMappingRepository } from './import-mapping.repository.js'
import {
  assignInstallmentGroups,
  type InstallmentLink,
} from './import-installments.js'
import { ImportTransactionRepository } from './import-transaction.repository.js'

const HOUR_MS = 60 * 60 * 1000

/** One row of a commit with the group it joins, in write order. */
interface PlannedRow {
  row: ImportCommitRow
  link: InstallmentLink | null
}

/**
 * Writes the rows the user picked from a preview, and takes a batch back.
 *
 * A commit is a series of ledger batches: rows already imported (their bank
 * id is on an ACTIVE row, read before writing) are skipped and counted, and
 * the rest go through the ledger's one insert group — the balance, the
 * history, and the card bill placement every other write gets — in chunks
 * of 500, oldest day first. Each chunk is atomic, and the `import_batch_id`
 * every row carries makes a partially applied import detectable and
 * re-runnable: a re-import skips the rows the bank ids already hold.
 */
export class ImportCommitService {
  constructor(
    private readonly db: Database,
    private readonly transactions: TransactionRepository,
    private readonly imports: ImportTransactionRepository,
    private readonly mappings: ImportMappingRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly clock: Clock
  ) {}

  async commit(
    tenantId: number,
    userId: number,
    body: ImportCommitBody
  ): Promise<ImportResult> {
    const account = await this.activeAccount(tenantId, body.accountId)

    await this.assertReferences(tenantId, body.rows)
    assertDatesOpen(account, body.rows, body.confirmReconciled)
    assertInstallmentsAllowed(account, body.rows)

    const batchId = randomUUID()
    const planned = planRows(body.rows)

    // The duplicate check reads before writing: a re-import of the same
    // file finds the first one's bank ids and skips them. (Two imports of
    // the same file committed at the same instant would both pass this
    // read; the partial unique index aborts the loser's chunk atomically.)
    const existing = await this.imports.findByExternalIds(
      tenantId,
      account.id,
      planned.flatMap(({ row }) =>
        row.externalId == null ? [] : [row.externalId]
      )
    )
    const seen = new Set<string>()
    const fresh: PlannedRow[] = []
    let skippedCount = 0

    for (const entry of planned) {
      const id = entry.row.externalId

      if (id != null) {
        if (existing.has(id) || seen.has(id)) {
          skippedCount++
          continue
        }

        seen.add(id)
      }

      fresh.push(entry)
    }

    for (const rows of chunk(fresh, IMPORT_CHUNK_SIZE)) {
      const chunkPlan = new LedgerBatchPlan()

      for (const { row, link } of rows) {
        const group = await this.transactions.planInsertGroup(
          this.db,
          tenantId,
          userId,
          toWrite(account.id, batchId, row, link)
        )

        chunkPlan.append(group.plan)
      }

      await chunkPlan.run(this.db)
    }

    if (body.mapping != null) {
      await this.mappings.save(tenantId, userId, account.id, body.mapping)
    }

    const imported = fresh.length
    const skipped = skippedCount

    return {
      batchId: imported === 0 ? null : batchId,
      imported,
      skippedDuplicates: skipped,
      undoUntil:
        imported === 0
          ? null
          : new Date(
              this.clock.now().getTime() + IMPORT_UNDO_HOURS * HOUR_MS
            ).toISOString(),
    }
  }

  /**
   * Soft-deletes every live row of a batch, reverting each row's balance
   * delta, within 24 hours of the import. The batch's rows are locked first
   * and their account after, like every other row write; a row deleted by
   * hand since is left alone. Answers 404 for a batch the tenant never
   * wrote and 409 once the window has passed.
   */
  async undo(
    tenantId: number,
    userId: number,
    batchId: string
  ): Promise<ImportUndoResult> {
    const batch = await this.imports.findBatch(tenantId, batchId)

    if (batch === undefined) {
      throw new NotFoundError(`No import ${batchId}.`)
    }

    const deadline = batch.importedAt.getTime() + IMPORT_UNDO_HOURS * HOUR_MS

    if (this.clock.now().getTime() > deadline) {
      throw new ConflictError(
        `An import can only be undone within ${IMPORT_UNDO_HOURS} hours.`
      )
    }

    // Every row of the batch is soft-deleted in one batch: the guarded
    // revert, the optimistic row write, and the gated history per row.
    const undoPlan = new LedgerBatchPlan()

    for (const row of batch.rows) {
      undoPlan.append(
        this.transactions.planSoftDeleteGroup(this.db, tenantId, userId, row)
      )
    }

    await undoPlan.run(this.db)

    return { undone: batch.rows.length }
  }

  /** The account's imports that can still be undone, newest first. */
  async recent(tenantId: number, accountId: number): Promise<ImportBatch[]> {
    const since = new Date(
      this.clock.now().getTime() - IMPORT_UNDO_HOURS * HOUR_MS
    )
    const batches = await this.imports.recentBatches(tenantId, accountId, since)

    return batches.map((batch) => ({
      batchId: batch.batchId,
      accountId,
      count: batch.count,
      importedAt: batch.importedAt.toISOString(),
      undoUntil: new Date(
        batch.importedAt.getTime() + IMPORT_UNDO_HOURS * HOUR_MS
      ).toISOString(),
    }))
  }

  /** The categories and receivers the rows name must be usable by the
   * tenant. */
  private async assertReferences(
    tenantId: number,
    rows: readonly ImportCommitRow[]
  ): Promise<void> {
    const [categories, receivers] = await Promise.all([
      this.categories.listActive(tenantId),
      this.receivers.listActive(tenantId),
    ])
    const categoryIds = new Set(categories.map((category) => category.id))
    const receiverIds = new Set(receivers.map((receiver) => receiver.id))

    for (const row of rows) {
      if (!categoryIds.has(row.categoryId)) {
        throw new NotFoundError(`No category with id ${row.categoryId}.`)
      }

      if (row.receiverId != null && !receiverIds.has(row.receiverId)) {
        throw new NotFoundError(`No receiver with id ${row.receiverId}.`)
      }
    }
  }

  private async activeAccount(
    tenantId: number,
    accountId: number
  ): Promise<Account> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${accountId}.`)
    }

    return account
  }
}

/** Orders rows oldest day first (the file order within a day) and gives the
 * rows linked as installments their groups. */
function planRows(rows: readonly ImportCommitRow[]): PlannedRow[] {
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        a.row.transactionDt.localeCompare(b.row.transactionDt) ||
        a.index - b.index
    )
    .map(({ row }) => row)
  const links = assignInstallmentGroups(ordered, randomUUID)

  return ordered.map((row, index) => ({ row, link: links[index] }))
}

/** The ledger write of one imported row. An installment already sits in the
 * cycle its own day names, so it takes no bill offset. */
function toWrite(
  accountId: number,
  batchId: string,
  row: ImportCommitRow,
  link: InstallmentLink | null
): TransactionWrite {
  return {
    name: row.name,
    note: row.note ?? null,
    invoice: null,
    amount: row.amount,
    transactionDt: row.transactionDt,
    linkedAccountId: accountId,
    categoryId: row.categoryId,
    receiverId: row.receiverId ?? null,
    recurringId: null,
    type: row.type,
    reviewStatus: row.status,
    statusNote: null,
    importBatchId: batchId,
    ...(row.externalId == null ? {} : { externalId: row.externalId }),
    ...(link === null
      ? {}
      : {
          installment: {
            groupId: link.groupId,
            number: link.number,
            count: link.count,
            billOffset: 0,
          },
        }),
  }
}

/** Rows on or before the account's `reconciledThrough` change a balance the
 * bank already confirmed: they ask first, like a hand-typed one does. */
function assertDatesOpen(
  account: Account,
  rows: readonly ImportCommitRow[],
  confirmed: boolean | undefined
): void {
  const through = account.reconciledThrough

  if (
    confirmed === true ||
    through === null ||
    !rows.some((row) => row.transactionDt <= through)
  ) {
    return
  }

  const conflict: ReconciledEditConflict = {
    message:
      'Some rows fall on days reconciled with the bank. Confirm to import them.',
    reconciledThrough: through,
  }

  throw new ConflictError(conflict)
}

/** Only a credit card expense can be an installment, on a card whose bill
 * days are set — the same rule the installment split enforces. */
function assertInstallmentsAllowed(
  account: Account,
  rows: readonly ImportCommitRow[]
): void {
  const linked = rows.filter((row) => row.installment != null)

  if (linked.length === 0) {
    return
  }

  if (
    account.type !== 'Credit Card' ||
    cardCycleOf(account) === null ||
    linked.some((row) => row.type !== 'Expense')
  ) {
    throw new ConflictError(
      'Only a credit card expense can be linked as an installment.'
    )
  }
}
