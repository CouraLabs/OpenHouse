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

const CSV_PAGE_SIZE = 500

export function goalRoutes(deps: {
  goals: GoalService
  audit: AuditRecorder
}): App {
  const router: App = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createGoalSchema)

    return context.json(
      toWire(await deps.goals.create(session.tenant.id, session.user.id, body)),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchGoalsSchema)

    const { rows, total } = await deps.goals.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

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

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.goals.find(session.tenant.id, id)))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateGoalSchema)

    return context.json(
      toWire(await deps.goals.update(session.tenant.id, session.user.id, body))
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.goals.softDelete(session.tenant.id, session.user.id, id)

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
