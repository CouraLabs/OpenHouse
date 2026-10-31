import { Hono } from 'hono'
import type { EntityStatus, Receiver, ReceiverType } from '@workspace/dto'
import {
  createReceiverSchema,
  exportReceiversSchema,
  searchReceiversSchema,
  updateReceiverSchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { csvChunks, pagesOf, type CsvColumn } from '@workspace/business'
import { parseJsonBody } from '../common/validation/parse.js'
import { RECEIVER_CSV_COLUMNS } from '@workspace/business'

const CSV_PAGE_SIZE = 500

export function receiversRoutes(): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createReceiverSchema)

    return context.json(
      toWire(
        await context.var.business.receivers.create(
          session.tenant.id,
          session.user.id,
          body
        )
      ),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchReceiversSchema)

    const { rows, total } = await context.var.business.receivers.search(
      session.tenant.id,
      args
    )

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportReceiversSchema)

    await context.var.business.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'receivers', locale: args.locale },
    })

    const read = async (skip: number, limit: number) => {
      const { rows } = await context.var.business.receivers.search(
        session.tenant.id,
        {
          ...args,
          skip,
          limit,
        }
      )

      return rows.map(toWire)
    }

    return csvResponse(
      RECEIVER_CSV_COLUMNS,
      pagesOf(read, CSV_PAGE_SIZE),
      args.locale,
      'receivers'
    )
  })

  router.get('/', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.receivers.listActive(session.tenant.id)
    )
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(
      toWire(await context.var.business.receivers.find(session.tenant.id, id))
    )
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateReceiverSchema)

    return context.json(
      toWire(
        await context.var.business.receivers.update(
          session.tenant.id,
          session.user.id,
          body
        )
      )
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await context.var.business.receivers.softDelete(
      session.tenant.id,
      session.user.id,
      id
    )

    return context.body(null, 204)
  })

  return { router }
}

function toWire(row: {
  id: number
  name: string
  type: ReceiverType
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Receiver {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}

function csvResponse<Row>(
  columns: readonly CsvColumn<Row>[],
  pages: AsyncIterable<Row[]>,
  locale: Parameters<typeof csvChunks>[2],
  entity: string
): Response {
  const chunks = csvChunks(columns, pages, locale)
  const encoder = new TextEncoder()
  const iterator = chunks[Symbol.asyncIterator]()

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(encoder.encode(value))
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${entity}.csv"`,
    },
  })
}
