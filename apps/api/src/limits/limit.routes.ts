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

/** How many rows one page of an export reads. */
const CSV_PAGE_SIZE = 500

/**
 * The limit routes. Everything here reads the tenant and the user from the
 * session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages limits.
 */
export function limitRoutes(deps: {
  limits: LimitService
  audit: AuditRecorder
}): App {
  const router: App = new Hono<AppEnv>()

  /** Creates a limit for the tenant. */
  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createLimitSchema)

    return context.json(
      toWire(await deps.limits.create(session.tenant.id, session.user.id, body)),
      201
    )
  })

  /** Searches the tenant's limits, paged, sorted and filtered. */
  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchLimitsSchema)

    const { rows, total } = await deps.limits.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  /** Streams the tenant's limits as a CSV: every row the search matches,
   * unpaged, written in the locale of the body. The rows are read page by
   * page while the response is written, so a large range never sits in
   * memory, and the export lands in the audit log. */
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

  /** Reads every ACTIVE limit with what the tenant has spent against it in
   * the period each limit covers — what the usage gauges render. */
  router.get('/usage', async (context) => {
    const session = context.get('session')
    const rows = await deps.limits.usage(session.tenant.id)

    return context.json(rows.map(toUsageWire))
  })

  /** Reads one limit, deleted rows included. */
  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.limits.find(session.tenant.id, id)))
  })

  /** Updates a limit. */
  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateLimitSchema)

    return context.json(
      toWire(await deps.limits.update(session.tenant.id, session.user.id, body))
    )
  })

  /** Soft-deletes a limit: its status becomes DELETED. */
  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.limits.softDelete(session.tenant.id, session.user.id, id)

    return context.body(null, 204)
  })

  return router
}

/** Streams the CSV chunks as the download the old exporter answered:
 * `text/csv; charset=utf-8`, offered as a file, read page by page. */
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

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
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

/** Maps a usage row onto the wire shape: the limit plus what it spent. */
function toUsageWire(row: LimitUsageView): LimitUsage {
  return {
    ...toWire(row),
    spent: row.spent,
    excludedCount: row.excludedCount,
  }
}
