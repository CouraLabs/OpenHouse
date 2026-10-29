import { Hono } from 'hono'
import type { EntityStatus, Receiver, ReceiverType } from '@workspace/poco'
import {
  createReceiverSchema,
  exportReceiversSchema,
  searchReceiversSchema,
  updateReceiverSchema,
} from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import type { AuditRecorder } from '../common/audit/audit-recorder.js'
import {
  csvChunks,
  pagesOf,
  type CsvColumn,
} from '../common/csv/csv.js'
import { parseJsonBody } from '../common/validation/parse.js'
import { RECEIVER_CSV_COLUMNS } from './receiver-csv.js'
import type { ReceiverService } from './receiver.service.js'

/** How many rows one page of an export reads. */
const CSV_PAGE_SIZE = 500

/**
 * The receiver routes. Everything here reads the tenant and the user from
 * the session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages receivers.
 */
export function receiversRoutes(deps: {
  receivers: ReceiverService
  audit: AuditRecorder
}): { router: App } {
  const router = new Hono<AppEnv>()

  /** Creates a receiver for the tenant. */
  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createReceiverSchema)

    return context.json(
      toWire(await deps.receivers.create(session.tenant.id, session.user.id, body)),
      201
    )
  })

  /** Searches the tenant's receivers, paged, sorted and filtered. */
  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchReceiversSchema)

    const { rows, total } = await deps.receivers.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  /** Streams the tenant's receivers as a CSV: every row the search
   * matches, unpaged, written in the locale of the body. */
  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportReceiversSchema)

    await deps.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'receivers', locale: args.locale },
    })

    const read = async (skip: number, limit: number) => {
      const { rows } = await deps.receivers.search(session.tenant.id, {
        ...args,
        skip,
        limit,
      })

      return rows.map(toWire)
    }

    return csvResponse(
      RECEIVER_CSV_COLUMNS,
      pagesOf(read, CSV_PAGE_SIZE),
      args.locale,
      'receivers'
    )
  })

  /** Lists the tenant's ACTIVE receivers by name, for pickers. */
  router.get('/', async (context) => {
    const session = context.get('session')

    return context.json(await deps.receivers.listActive(session.tenant.id))
  })

  /** Reads one receiver, deleted rows included. */
  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.receivers.find(session.tenant.id, id)))
  })

  /** Updates a receiver. */
  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateReceiverSchema)

    return context.json(
      toWire(await deps.receivers.update(session.tenant.id, session.user.id, body))
    )
  })

  /** Soft-deletes a receiver: its status becomes DELETED. */
  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.receivers.softDelete(session.tenant.id, session.user.id, id)

    return context.body(null, 204)
  })

  return { router }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
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

/** The response of a CSV download: the file, streamed page by page, with
 * the content type and file name the previous framework set. */
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
