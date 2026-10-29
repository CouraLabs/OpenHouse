import { Hono } from 'hono'
import { z } from 'zod'
import {
  changeTransactionStatusSchema,
  createTransactionSchema,
  deleteInstallmentGroupSchema,
  deleteTransactionQuerySchema,
  exportTransactionsSchema,
  installmentsSchema,
  moveToStatementSchema,
  reconcilePreviewSchema,
  reconcileSchema,
  refundInstallmentGroupSchema,
  searchTransactionsSchema,
  settleUpSchema,
  transactionBreakdownSchema,
  transferSchema,
  updateInstallmentGroupSchema,
  updateTransactionSchema,
} from '@workspace/poco'
import type { InstallmentGroup, InstallmentRefund, TransactionHistoryAction } from '@workspace/poco'

import type { AppEnv, App } from '../common/context.js'
import type { AuditRecorder } from '../common/audit/audit-recorder.js'
import { BadRequestError } from '../common/errors.js'
import { csvChunks, pagesOf } from '../common/csv/csv.js'
import { parseJsonBody, parseQuery } from '../common/validation/parse.js'
import type { InstallmentService } from './installment.service.js'
import type { ReconciliationService } from './reconciliation.service.js'
import { TRANSACTION_CSV_COLUMNS } from './transaction-csv.js'
import type { TransactionService } from './transaction.service.js'
import { toWire } from './transaction-wire.js'

/**
 * How many rows one page of the export reads — the same ceiling the CSV
 * exporter used.
 */
const CSV_PAGE_SIZE = 500

/**
 * The transaction routes. Everything here reads the tenant and the user
 * from the session, so a client can only ever see or act on its own tenant
 * — the request names no tenant anywhere. Every signed-in role manages
 * transactions. A ledger write that keeps colliding with concurrent writes
 * on the same accounts answers 409 (`LedgerConflictError`, which
 * `app.onError` maps), never 500.
 */
export function transactionsRoutes(deps: {
  transactions: TransactionService
  installments: InstallmentService
  reconciliation: ReconciliationService
  audit: AuditRecorder
}): { router: App; reconciliationRouter: App } {
  const router = new Hono<AppEnv>()

  /** Creates a transaction for the tenant, moving the account's balance. */
  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createTransactionSchema)

    return context.json(
      toWire(
        await deps.transactions.create(session.tenant.id, session.user.id, body)
      ),
      201
    )
  })

  /** Searches the tenant's transactions, paged, sorted and filtered. */
  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionsSchema)
    const { rows, total } = await deps.transactions.search(
      session.tenant.id,
      args
    )

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  /**
   * Streams the transactions the filter matches as a CSV, unpaged: the
   * page's own search args, written in the locale of the body. The rows are
   * read page by page while the response is written, so a large range
   * never sits in memory. Every export is recorded in the audit log.
   */
  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportTransactionsSchema)

    await deps.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'transactions', locale: args.locale },
    })

    const chunks = csvChunks(
      TRANSACTION_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await deps.transactions.search(session.tenant.id, {
          ...args,
          skip,
          limit: size,
        })

        return rows.map(toWire)
      }, CSV_PAGE_SIZE),
      args.locale
    )

    return csvDownload(chunks, 'transactions.csv')
  })

  /** Totals the tenant's transactions over a filter, grouped by currency. */
  router.post('/summary', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionsSchema)
    const groups = await deps.transactions.summary(
      session.tenant.id,
      args.filter
    )

    return context.json({ groups }, 201)
  })

  /** Totals the tenant's expenses over a filter, grouped by category or by
   * account, per currency — what the expense pies render. */
  router.post('/breakdown', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(
      context,
      transactionBreakdownSchema
    )
    const groups = await deps.transactions.breakdown(session.tenant.id, args)

    return context.json({ groups }, 201)
  })

  /** Moves money between two accounts: two transactions, one ledger
   * batch. */
  router.post('/transfer', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, transferSchema)
    const [from, to] = await deps.transactions.transfer(
      session.tenant.id,
      session.user.id,
      body
    )

    return context.json([from, to].map(toWire), 201)
  })

  /** Records a settle-up between two members: a transfer between their
   * accounts (or an expense to the member), flagged as a settlement. */
  router.post('/settle', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, settleUpSchema)
    const rows = await deps.transactions.settle(
      session.tenant.id,
      session.user.id,
      body
    )

    return context.json(rows.map(toWire), 201)
  })

  // --- The installment purchase routes ---

  /** Reads one purchase: its installments, total, and editability. */
  router.get(
    '/installments/:groupId',
    async (context) => {
      const session = context.get('session')
      const groupId = uuidParam(context, 'groupId')

      return context.json(
        toGroupWire(await deps.installments.find(session.tenant.id, groupId))
      )
    }
  )

  /** Edits a purchase as a whole: shared fields always, amount and count
   * only while no installment is billed (409 otherwise). */
  router.put(
    '/installments/:groupId',
    async (context) => {
      const session = context.get('session')
      const groupId = uuidParam(context, 'groupId')
      const body = await parseJsonBody(context, updateInstallmentGroupSchema)

      return context.json(
        toGroupWire(
          await deps.installments.update(
            session.tenant.id,
            session.user.id,
            groupId,
            body
          )
        )
      )
    }
  )

  /** Deletes a purchase's installments: `scope=all` (409 once billed) or
   * `scope=remaining` — those still on an Open bill. */
  router.delete(
    '/installments/:groupId',
    async (context) => {
      const session = context.get('session')
      const groupId = uuidParam(context, 'groupId')
      const query = await parseQuery(context, deleteInstallmentGroupSchema)

      await deps.installments.delete(
        session.tenant.id,
        session.user.id,
        groupId,
        query.scope
      )

      return context.body(null, 204)
    }
  )

  /** Refunds a purchase in full: remaining installments deleted, what was
   * billed credited on the open bill. */
  router.post(
    '/installments/:groupId/refund',
    async (context) => {
      const session = context.get('session')
      const groupId = uuidParam(context, 'groupId')
      const body = await parseJsonBody(context, refundInstallmentGroupSchema)
      const refund = await deps.installments.refund(
        session.tenant.id,
        session.user.id,
        groupId,
        body.name
      )

      return context.json(
        {
          refund: refund === null ? null : toWire(refund),
        } satisfies InstallmentRefund,
        201
      )
    }
  )

  /** Collapses a purchase back into one row, while no installment is
   * billed. */
  router.post(
    '/installments/:groupId/collapse',
    async (context) => {
      const session = context.get('session')
      const groupId = uuidParam(context, 'groupId')

      return context.json(
        toWire(
          await deps.installments.collapse(
            session.tenant.id,
            session.user.id,
            groupId
          )
        ),
        201
      )
    }
  )

  /** Splits a single card expense into installments, while its bill is
   * Open. */
  router.post(
    '/:id/installments',
    async (context) => {
      const session = context.get('session')
      const id = intParam(context, 'id')
      const body = await parseJsonBody(context, installmentsSchema)

      return context.json(
        toGroupWire(
          await deps.installments.convert(
            session.tenant.id,
            session.user.id,
            id,
            body
          )
        ),
        201
      )
    }
  )

  // --- The single-row reads and writes ---

  /** Reads one transaction, deleted rows included. */
  router.get(
    '/:id',
    async (context) => {
      const session = context.get('session')

      return context.json(
        toWire(await deps.transactions.find(session.tenant.id, intParam(context, 'id')))
      )
    }
  )

  /** Reads a transaction's history: one append-only entry per change,
   * newest first. */
  router.get(
    '/:id/history',
    async (context) => {
      const session = context.get('session')
      const rows = await deps.transactions.findHistory(
        session.tenant.id,
        intParam(context, 'id')
      )

      return context.json(rows.map(toHistoryWire))
    }
  )

  /** Updates a transaction, moving both accounts' balances to match. */
  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateTransactionSchema)

    return context.json(
      toWire(
        await deps.transactions.update(session.tenant.id, session.user.id, body)
      )
    )
  })

  /** Changes only a transaction's review status: no other field is written,
   * and no balance moves. Both sides of a transfer flip together. */
  router.patch(
    '/:id/status',
    async (context) => {
      const session = context.get('session')
      const body = await parseJsonBody(context, changeTransactionStatusSchema)

      return context.json(
        toWire(
          await deps.transactions.changeStatus(session.tenant.id, session.user.id, {
            ...body,
            id: intParam(context, 'id'),
          })
        )
      )
    }
  )

  /** Moves a card charge to another bill of the same card and pins it
   * there. Answers the row with a `STATEMENT_CLOSED` warning when that bill
   * is already closed. */
  router.patch(
    '/:id/statement',
    async (context) => {
      const session = context.get('session')
      const body = await parseJsonBody(context, moveToStatementSchema)

      return context.json(
        toWire(
          await deps.transactions.moveToStatement(
            session.tenant.id,
            session.user.id,
            intParam(context, 'id'),
            body
          )
        )
      )
    }
  )

  /** Soft-deletes a transaction: the account's balance is reverted in the
   * same ledger batch that marks the row DELETED. */
  router.delete(
    '/:id',
    async (context) => {
      const session = context.get('session')
      const query = await parseQuery(context, deleteTransactionQuerySchema)

      await deps.transactions.softDelete(
        session.tenant.id,
        session.user.id,
        intParam(context, 'id'),
        query.confirmReconciled
      )

      return context.body(null, 204)
    }
  )

  // --- The reconciliation routes (the prefix the controller carried) ---

  const reconciliationRouter = new Hono<AppEnv>()

  /** What the ledger computes on the day, the difference, and the rows
   * still on Verify. Writes nothing. */
  reconciliationRouter.post(
    '/:accountId/preview',
    async (context) => {
      const session = context.get('session')
      const accountId = intParam(context, 'accountId')
      const body = await parseJsonBody(
        context,
        reconcilePreviewSchema
      )
      const result = await deps.reconciliation.preview(
        session.tenant.id,
        accountId,
        body
      )

      return context.json({
        accountId,
        currency: result.account.currency,
        date: body.date,
        bankBalance: body.bankBalance,
        computedBalance: result.computedBalance,
        difference: result.difference,
        verifyRows: result.verifyRows.map(toWire),
        verifyCount: result.verifyCount,
      })
    }
  )

  /** Commits the reconciliation: adjustment, checks, and the lock. */
  reconciliationRouter.post(
    '/:accountId',
    async (context) => {
      const session = context.get('session')
      const accountId = intParam(context, 'accountId')
      const body = await parseJsonBody(context, reconcileSchema)
      const outcome = await deps.reconciliation.reconcile(
        session.tenant.id,
        session.user.id,
        accountId,
        body
      )

      return context.json({
        reconciledThrough: outcome.reconciledThrough,
        balance: outcome.balance,
        adjustment:
          outcome.adjustment === null ? null : toWire(outcome.adjustment),
        checkedCount: outcome.checkedCount,
      })
    }
  )

  return { router, reconciliationRouter }
}

/**
 * Streams a CSV download: the chunks ride a `ReadableStream` of bytes, read
 * lazily one page at a time, with the headers the browser saves a file by.
 */
function csvDownload(chunks: AsyncGenerator<string>, filename: string): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await chunks.next()

      if (next.done) {
        controller.close()

        return
      }

      controller.enqueue(encoder.encode(next.value))
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}

/** An integer path parameter, the way the `ParseIntPipe` read it: 400 when
 * the segment is not a number. */
function intParam(context: import('hono').Context<AppEnv>, name: string): number {
  const value = Number.parseInt(context.req.param(name) ?? '', 10)

  if (Number.isNaN(value)) {
    throw new BadRequestError(`The ${name} of the route is not a number.`)
  }

  return value
}

/** A UUID path parameter, the way the `ParseUUIDPipe` read it: 400 when the
 * segment is not one. */
function uuidParam(
  context: import('hono').Context<AppEnv>,
  name: string
): string {
  const value = context.req.param(name) ?? ''
  const parsed = z.uuid().safeParse(value)

  if (!parsed.success) {
    throw new BadRequestError(`The ${name} of the route is not an uuid.`)
  }

  return parsed.data
}

/** Maps a history row onto the wire shape. */
function toHistoryWire(row: {
  id: number
  transactionId: number
  action: TransactionHistoryAction
  before: unknown
  after: unknown
  createdBy: number | null
  createdDt: Date
}): import('@workspace/poco').TransactionHistoryEntry {
  return {
    id: row.id,
    transactionId: row.transactionId,
    action: row.action,
    before: row.before,
    after: row.after,
    createdBy: row.createdBy,
    createdDt: row.createdDt.toISOString(),
  }
}

/** Maps a purchase onto the wire: its shared fields from installment 1. */
function toGroupWire(view: {
  groupId: string
  rows: import('./transaction.repository.js').TransactionRow[]
  total: string
  editable: boolean
}): InstallmentGroup {
  const [first] = view.rows

  return {
    groupId: view.groupId,
    name: first.name,
    note: first.note,
    categoryId: first.categoryId,
    receiverId: first.receiverId,
    linkedAccountId: first.linkedAccountId,
    currency: first.currency,
    transactionDt: first.transactionDt,
    count: first.installmentCount ?? view.rows.length,
    total: view.total,
    editable: view.editable,
    installments: view.rows.map(toWire),
  }
}
