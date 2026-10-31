import { Hono } from 'hono'
import { z } from 'zod'
import {
  billedOnPreviewSchema,
  changeTransactionStatusSchema,
  createTransactionSchema,
  deleteInstallmentGroupSchema,
  deleteTransactionQuerySchema,
  exportTransactionsSchema,
  installmentsPreviewSchema,
  installmentsSchema,
  moveToStatementSchema,
  reconcilePreviewSchema,
  reconcileSchema,
  refundInstallmentGroupSchema,
  searchTransactionsSchema,
  settleUpSchema,
  splitPreviewSchema,
  transactionBreakdownSchema,
  transferSchema,
  updateInstallmentGroupSchema,
  updateTransactionSchema,
} from '@workspace/dto'
import type {
  InstallmentGroup,
  InstallmentRefund,
  TransactionHistoryAction,
} from '@workspace/dto'

import type { AppEnv, App } from '../common/context.js'
import { BadRequestError } from '@workspace/business'
import { csvChunks, pagesOf } from '@workspace/business'
import { parseJsonBody, parseQuery } from '../common/validation/parse.js'
import {
  type InstallmentGroupView,
  TRANSACTION_CSV_COLUMNS,
  toWire,
} from '@workspace/business'

const CSV_PAGE_SIZE = 500

export function transactionsRoutes(): { router: App; reconciliationRouter: App } {
  const router = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createTransactionSchema)

    return context.json(
      toWire(
        await context.var.business.transactions.create(session.tenant.id, session.user.id, body)
      ),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionsSchema)
    const { rows, total } = await context.var.business.transactions.search(
      session.tenant.id,
      args
    )

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportTransactionsSchema)

    await context.var.business.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'transactions', locale: args.locale },
    })

    const chunks = csvChunks(
      TRANSACTION_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await context.var.business.transactions.search(session.tenant.id, {
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

    return context.json(
      await context.var.business.transactions.summary(session.tenant.id, args.filter),
      201
    )
  })

  router.post('/splits/preview', async (context) => {
    const body = await parseJsonBody(context, splitPreviewSchema)

    return context.json(context.var.business.transactions.previewSplit(body))
  })

  router.post('/installments/preview', async (context) => {
    const body = await parseJsonBody(context, installmentsPreviewSchema)

    return context.json(context.var.business.transactions.previewInstallments(body))
  })

  router.post('/billed-on/preview', async (context) => {
    const body = await parseJsonBody(context, billedOnPreviewSchema)

    return context.json(context.var.business.transactions.previewBilledOn(body))
  })

  router.post('/breakdown', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, transactionBreakdownSchema)
    const groups = await context.var.business.transactions.breakdown(session.tenant.id, args)

    return context.json({ groups }, 201)
  })

  router.post('/transfer', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, transferSchema)
    const [from, to] = await context.var.business.transactions.transfer(
      session.tenant.id,
      session.user.id,
      body
    )

    return context.json([from, to].map(toWire), 201)
  })

  router.post('/settle', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, settleUpSchema)
    const rows = await context.var.business.transactions.settle(
      session.tenant.id,
      session.user.id,
      body
    )

    return context.json(rows.map(toWire), 201)
  })

  router.get('/installments/:groupId', async (context) => {
    const session = context.get('session')
    const groupId = uuidParam(context, 'groupId')

    return context.json(
      toGroupWire(await context.var.business.installments.find(session.tenant.id, groupId))
    )
  })

  router.put('/installments/:groupId', async (context) => {
    const session = context.get('session')
    const groupId = uuidParam(context, 'groupId')
    const body = await parseJsonBody(context, updateInstallmentGroupSchema)

    return context.json(
      toGroupWire(
        await context.var.business.installments.update(
          session.tenant.id,
          session.user.id,
          groupId,
          body
        )
      )
    )
  })

  router.delete('/installments/:groupId', async (context) => {
    const session = context.get('session')
    const groupId = uuidParam(context, 'groupId')
    const query = await parseQuery(context, deleteInstallmentGroupSchema)

    await context.var.business.installments.delete(
      session.tenant.id,
      session.user.id,
      groupId,
      query.scope
    )

    return context.body(null, 204)
  })

  router.post('/installments/:groupId/refund', async (context) => {
    const session = context.get('session')
    const groupId = uuidParam(context, 'groupId')
    const body = await parseJsonBody(context, refundInstallmentGroupSchema)
    const refund = await context.var.business.installments.refund(
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
  })

  router.post('/installments/:groupId/collapse', async (context) => {
    const session = context.get('session')
    const groupId = uuidParam(context, 'groupId')

    return context.json(
      toWire(
        await context.var.business.installments.collapse(
          session.tenant.id,
          session.user.id,
          groupId
        )
      ),
      201
    )
  })

  router.post('/:id/installments', async (context) => {
    const session = context.get('session')
    const id = intParam(context, 'id')
    const body = await parseJsonBody(context, installmentsSchema)

    return context.json(
      toGroupWire(
        await context.var.business.installments.convert(
          session.tenant.id,
          session.user.id,
          id,
          body
        )
      ),
      201
    )
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')

    return context.json(
      toWire(
        await context.var.business.transactions.find(session.tenant.id, intParam(context, 'id'))
      )
    )
  })

  router.get('/:id/history', async (context) => {
    const session = context.get('session')
    const rows = await context.var.business.transactions.findHistory(
      session.tenant.id,
      intParam(context, 'id')
    )

    return context.json(rows.map(toHistoryWire))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateTransactionSchema)

    return context.json(
      toWire(
        await context.var.business.transactions.update(session.tenant.id, session.user.id, body)
      )
    )
  })

  router.patch('/:id/status', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, changeTransactionStatusSchema)

    return context.json(
      toWire(
        await context.var.business.transactions.changeStatus(
          session.tenant.id,
          session.user.id,
          {
            ...body,
            id: intParam(context, 'id'),
          }
        )
      )
    )
  })

  router.patch('/:id/statement', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, moveToStatementSchema)

    return context.json(
      toWire(
        await context.var.business.transactions.moveToStatement(
          session.tenant.id,
          session.user.id,
          intParam(context, 'id'),
          body
        )
      )
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const query = await parseQuery(context, deleteTransactionQuerySchema)

    await context.var.business.transactions.softDelete(
      session.tenant.id,
      session.user.id,
      intParam(context, 'id'),
      query.confirmReconciled
    )

    return context.body(null, 204)
  })

  const reconciliationRouter = new Hono<AppEnv>()

  reconciliationRouter.post('/:accountId/preview', async (context) => {
    const session = context.get('session')
    const accountId = intParam(context, 'accountId')
    const body = await parseJsonBody(context, reconcilePreviewSchema)
    const result = await context.var.business.reconciliation.preview(
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
      tone: result.tone,
      verifyRows: result.verifyRows.map(toWire),
      verifyCount: result.verifyCount,
    })
  })

  reconciliationRouter.post('/:accountId', async (context) => {
    const session = context.get('session')
    const accountId = intParam(context, 'accountId')
    const body = await parseJsonBody(context, reconcileSchema)
    const outcome = await context.var.business.reconciliation.reconcile(
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
  })

  return { router, reconciliationRouter }
}

function csvDownload(
  chunks: AsyncGenerator<string>,
  filename: string
): Response {
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

function intParam(
  context: import('hono').Context<AppEnv>,
  name: string
): number {
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
}): import('@workspace/dto').TransactionHistoryEntry {
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

function toGroupWire(view: InstallmentGroupView): InstallmentGroup {
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
