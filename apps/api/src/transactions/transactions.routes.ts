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

const CSV_PAGE_SIZE = 500

export function transactionsRoutes(deps: {
  transactions: TransactionService
  installments: InstallmentService
  reconciliation: ReconciliationService
  audit: AuditRecorder
}): { router: App; reconciliationRouter: App } {
  const router = new Hono<AppEnv>()

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

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionsSchema)
    const { rows, total } = await deps.transactions.search(
      session.tenant.id,
      args
    )

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

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

  router.post('/summary', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionsSchema)
    const groups = await deps.transactions.summary(
      session.tenant.id,
      args.filter
    )

    return context.json({ groups }, 201)
  })

  router.post('/breakdown', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(
      context,
      transactionBreakdownSchema
    )
    const groups = await deps.transactions.breakdown(session.tenant.id, args)

    return context.json({ groups }, 201)
  })

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

  router.get(
    '/:id',
    async (context) => {
      const session = context.get('session')

      return context.json(
        toWire(await deps.transactions.find(session.tenant.id, intParam(context, 'id')))
      )
    }
  )

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

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateTransactionSchema)

    return context.json(
      toWire(
        await deps.transactions.update(session.tenant.id, session.user.id, body)
      )
    )
  })

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

  const reconciliationRouter = new Hono<AppEnv>()

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

function intParam(context: import('hono').Context<AppEnv>, name: string): number {
  const value = Number.parseInt(context.req.param(name) ?? '', 10)

  if (Number.isNaN(value)) {
    throw new BadRequestError(`The ${name} of the route is not a number.`)
  }

  return value
}

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
