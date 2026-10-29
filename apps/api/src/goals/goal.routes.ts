import { Hono } from 'hono'
import type {
  Currency,
  EntityStatus,
  Goal,
} from '@workspace/poco'
import {
  createGoalSchema,
  exportGoalsSchema,
  searchGoalsSchema,
  updateGoalSchema,
} from '@workspace/poco'

import type { AuditRecorder } from '../common/audit/audit-recorder.js'
import type { App, AppEnv } from '../common/context.js'
import { csvChunks, pagesOf, } from '../common/csv/csv.js'
import { parseJsonBody } from '../common/validation/parse.js'
import { GOAL_CSV_COLUMNS } from './goal-csv.js'
import type { GoalService } from './goal.service.js'

/** How many rows one page of an export reads. */
const CSV_PAGE_SIZE = 500

/**
 * The goal routes. Everything here reads the tenant and the user from the
 * session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages goals.
 */
export function goalRoutes(deps: {
  goals: GoalService
  audit: AuditRecorder
}): App {
  const router: App = new Hono<AppEnv>()

  /** Creates a goal for the tenant. */
  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createGoalSchema)

    return context.json(
      toWire(await deps.goals.create(session.tenant.id, session.user.id, body)),
      201
    )
  })

  /** Searches the tenant's goals, paged, sorted and filtered. */
  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchGoalsSchema)

    const { rows, total } = await deps.goals.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  /** Streams the tenant's goals as a CSV: every row the search matches,
   * unpaged, written in the locale of the body. The rows are read page by
   * page while the response is written, so a large range never sits in
   * memory, and the export lands in the audit log. */
  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportGoalsSchema)

    await deps.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'goals', locale: args.locale },
    })

    const chunks = csvChunks(
      GOAL_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await deps.goals.search(session.tenant.id, {
          ...args,
          skip,
          limit: size,
        })

        return rows.map(toWire)
      }, CSV_PAGE_SIZE),
      args.locale
    )

    return csvResponse(chunks, 'goals')
  })

  /** Reads one goal, deleted rows included. */
  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.goals.find(session.tenant.id, id)))
  })

  /** Updates a goal. */
  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateGoalSchema)

    return context.json(
      toWire(await deps.goals.update(session.tenant.id, session.user.id, body))
    )
  })

  /** Soft-deletes a goal: its status becomes DELETED. */
  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.goals.softDelete(session.tenant.id, session.user.id, id)

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

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. The
 * `date` columns carry no time or zone, so they cross as `YYYY-MM-DD`. */
function toWire(row: {
  id: number
  name: string
  linkedAccountId: number
  accountName: string
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
  currency: Currency
  accountCurrency: Currency
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Goal {
  return {
    id: row.id,
    name: row.name,
    linkedAccountId: row.linkedAccountId,
    accountName: row.accountName,
    balance: row.balance,
    balanceDt: row.balanceDt,
    targetBalance: row.targetBalance,
    targetDt: row.targetDt,
    currency: row.currency,
    accountCurrency: row.accountCurrency,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
