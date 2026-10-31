import { Hono } from 'hono'
import type {
  Currency,
  EntityStatus,
  Frequency,
  RecurringTransaction,
  TransactionType,
} from '@workspace/dto'
import {
  nextOccurrence,
  parseSplit,
  RECURRING_CSV_COLUMNS,
} from '@workspace/business'
import {
  createRecurringTransactionSchema,
  exportRecurringTransactionsSchema,
  nextOccurrenceSchema,
  searchRecurringTransactionsSchema,
  updateRecurringTransactionSchema,
} from '@workspace/dto'

import type { AppEnv, App } from '../common/context.js'
import { BadRequestError } from '@workspace/business'
import { csvChunks, pagesOf } from '@workspace/business'
import { parseJsonBody } from '../common/validation/parse.js'

const CSV_PAGE_SIZE = 500

export function recurringTransactionRoutes(): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/next-occurrence', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, nextOccurrenceSchema)

    return context.json(
      await context.var.business.recurring.previewNextOccurrence(session.tenant.id, body)
    )
  })

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createRecurringTransactionSchema)
    const [row, today] = await Promise.all([
      context.var.business.recurring.create(session.tenant.id, session.user.id, body),
      context.var.business.recurring.todayOf(session.tenant.id),
    ])

    return context.json(toWire(row, today), 201)
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchRecurringTransactionsSchema)
    const [{ rows, total }, today] = await Promise.all([
      context.var.business.recurring.search(session.tenant.id, args),
      context.var.business.recurring.todayOf(session.tenant.id),
    ])

    return context.json(
      { total, items: rows.map((row) => toWire(row, today)) },
      201
    )
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportRecurringTransactionsSchema)
    const today = await context.var.business.recurring.todayOf(session.tenant.id)

    await context.var.business.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'recurring-transactions', locale: args.locale },
    })

    const chunks = csvChunks(
      RECURRING_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await context.var.business.recurring.search(session.tenant.id, {
          ...args,
          skip,
          limit: size,
        })

        return rows.map((row) => toWire(row, today))
      }, CSV_PAGE_SIZE),
      args.locale
    )

    return csvDownload(chunks, 'recurring-transactions.csv')
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const [row, today] = await Promise.all([
      context.var.business.recurring.find(session.tenant.id, intParam(context, 'id')),
      context.var.business.recurring.todayOf(session.tenant.id),
    ])

    return context.json(toWire(row, today))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateRecurringTransactionSchema)
    const [row, today] = await Promise.all([
      context.var.business.recurring.update(session.tenant.id, session.user.id, body),
      context.var.business.recurring.todayOf(session.tenant.id),
    ])

    return context.json(toWire(row, today))
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')

    await context.var.business.recurring.softDelete(
      session.tenant.id,
      session.user.id,
      intParam(context, 'id')
    )

    return context.body(null, 204)
  })

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

function toWire(
  row: {
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
  },
  today: string
): RecurringTransaction {
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
    nextDate: nextOccurrence(row, today),
    paidByUserId: row.paidByUserId,
    paidByName: row.paidByName,
    defaultSplit: parseSplit(row.defaultSplit),
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
