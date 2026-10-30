import { Hono } from 'hono'
import type {
  Currency,
  EntityStatus,
  Limit,
  LimitType,
  LimitUsage,
} from '@workspace/poco'
import {
  createLimitSchema,
  exportLimitsSchema,
  searchLimitsSchema,
  updateLimitSchema,
} from '@workspace/poco'

import type { AuditRecorder } from '../common/audit/audit-recorder.js'
import type { App, AppEnv } from '../common/context.js'
import { csvChunks, pagesOf, } from '../common/csv/csv.js'
import { parseJsonBody } from '../common/validation/parse.js'
import { LIMIT_CSV_COLUMNS } from './limit-csv.js'
import { LimitService, type LimitUsageView } from './limit.service.js'

const CSV_PAGE_SIZE = 500

export function limitRoutes(deps: {
  limits: LimitService
  audit: AuditRecorder
}): App {
  const router: App = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createLimitSchema)

    return context.json(
      toWire(await deps.limits.create(session.tenant.id, session.user.id, body)),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchLimitsSchema)

    const { rows, total } = await deps.limits.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportLimitsSchema)

    await deps.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'limits', locale: args.locale },
    })

    const chunks = csvChunks(
      LIMIT_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await deps.limits.search(session.tenant.id, {
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
    const rows = await deps.limits.usage(session.tenant.id)

    return context.json(rows.map(toUsageWire))
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.limits.find(session.tenant.id, id)))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateLimitSchema)

    return context.json(
      toWire(await deps.limits.update(session.tenant.id, session.user.id, body))
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.limits.softDelete(session.tenant.id, session.user.id, id)

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
