import { Hono } from 'hono'
import type {
  Currency,
  EntityStatus,
  Frequency,
  RecurringTransaction,
  TransactionType,
} from '@workspace/poco'
import {
  createRecurringTransactionSchema,
  exportRecurringTransactionsSchema,
  parseSplit,
  searchRecurringTransactionsSchema,
  updateRecurringTransactionSchema,
} from '@workspace/poco'

import type { AppEnv, App } from '../common/context.js'
import type { AuditRecorder } from '../common/audit/audit-recorder.js'
import { BadRequestError } from '../common/errors.js'
import { csvChunks, pagesOf } from '../common/csv/csv.js'
import { parseJsonBody } from '../common/validation/parse.js'
import { RECURRING_CSV_COLUMNS } from './recurring-transaction-csv.js'
import type { RecurringTransactionService } from './recurring-transaction.service.js'

const CSV_PAGE_SIZE = 500

export function recurringTransactionRoutes(deps: {
  recurring: RecurringTransactionService
  audit: AuditRecorder
}): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createRecurringTransactionSchema)

    return context.json(
      toWire(
        await deps.recurring.create(session.tenant.id, session.user.id, body)
      ),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchRecurringTransactionsSchema)
    const { rows, total } = await deps.recurring.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportRecurringTransactionsSchema)

    await deps.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'recurring-transactions', locale: args.locale },
    })

    const chunks = csvChunks(
      RECURRING_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await deps.recurring.search(session.tenant.id, {
          ...args,
          skip,
          limit: size,
        })

        return rows.map(toWire)
      }, CSV_PAGE_SIZE),
      args.locale
    )

    return csvDownload(chunks, 'recurring-transactions.csv')
  })

  router.get(
    '/:id',
    async (context) => {
      const session = context.get('session')

      return context.json(
        toWire(
          await deps.recurring.find(
            session.tenant.id,
            intParam(context, 'id')
          )
        )
      )
    }
  )

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateRecurringTransactionSchema)

    return context.json(
      toWire(
        await deps.recurring.update(session.tenant.id, session.user.id, body)
      )
    )
  })

  router.delete(
    '/:id',
    async (context) => {
      const session = context.get('session')

      await deps.recurring.softDelete(
        session.tenant.id,
        session.user.id,
        intParam(context, 'id')
      )

      return context.body(null, 204)
    }
  )

  return { router }
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

function intParam(context: import('hono').Context<AppEnv>, name: string): number {
  const value = Number.parseInt(context.req.param(name) ?? '', 10)

  if (Number.isNaN(value)) {
    throw new BadRequestError(`The ${name} of the route is not a number.`)
  }

  return value
}

function toWire(row: {
  id: number
  receiverId: number
  receiverName: string
  categoryId: number
  categoryName: string
  linkedAccountId: number
  accountName: string
  accountCurrency: Currency
  amount: string
  type: TransactionType
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
  paidByUserId: number | null
  paidByName: string | null
  defaultSplit: unknown
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): RecurringTransaction {
  return {
    id: row.id,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    linkedAccountId: row.linkedAccountId,
    accountName: row.accountName,
    accountCurrency: row.accountCurrency,
    amount: row.amount,
    type: row.type,
    frequency: row.frequency,
    frequencyDay: row.frequencyDay,
    frequencyMonth: row.frequencyMonth,
    paidByUserId: row.paidByUserId,
    paidByName: row.paidByName,
    defaultSplit: parseSplit(row.defaultSplit),
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
