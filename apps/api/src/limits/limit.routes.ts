import { Hono } from 'hono'
import type {
  Currency,
  EntityStatus,
  Limit,
  LimitType,
  LimitUsage,
} from '@workspace/dto'
import {
  createLimitSchema,
  exportLimitsSchema,
  searchLimitsSchema,
  updateLimitSchema,
} from '@workspace/dto'

import { LIMIT_CSV_COLUMNS, type LimitUsageView } from '@workspace/business'
import type { App, AppEnv } from '../common/context.js'
import { csvChunks, pagesOf } from '@workspace/business'
import { parseJsonBody } from '../common/validation/parse.js'

const CSV_PAGE_SIZE = 500

export function limitRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createLimitSchema)

    return context.json(
      toWire(
        await context.var.business.limits.create(session.tenant.id, session.user.id, body)
      ),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchLimitsSchema)

    const { rows, total } = await context.var.business.limits.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportLimitsSchema)

    await context.var.business.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'limits', locale: args.locale },
    })

    const chunks = csvChunks(
      LIMIT_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await context.var.business.limits.search(session.tenant.id, {
          ...args,
          skip,
          limit: size,
        })

        return rows.map(toWire)
      }, CSV_PAGE_SIZE),
      args.locale
    )

    return csvResponse(chunks, 'limits')
  })

  router.get('/usage', async (context) => {
    const session = context.get('session')
    const rows = await context.var.business.limits.usage(session.tenant.id)

    return context.json(rows.map(toUsageWire))
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await context.var.business.limits.find(session.tenant.id, id)))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateLimitSchema)

    return context.json(
      toWire(await context.var.business.limits.update(session.tenant.id, session.user.id, body))
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await context.var.business.limits.softDelete(session.tenant.id, session.user.id, id)

    return context.body(null, 204)
  })

  return router
}

function csvResponse(chunks: AsyncGenerator<string>, entity: string): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await chunks.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(encoder.encode(value))
      }
    },
  })

  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${entity}.csv"`,
    },
  })
}

function toWire(row: {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Limit {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amount: row.amount,
    type: row.type,
    currency: row.currency,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}

function toUsageWire(row: LimitUsageView): LimitUsage {
  return {
    ...toWire(row),
    spent: row.spent,
    excludedCount: row.excludedCount,
  }
}
