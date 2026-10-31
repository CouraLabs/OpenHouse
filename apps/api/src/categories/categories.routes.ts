import { Hono } from 'hono'
import type { Category, CategoryRef, EntityStatus } from '@workspace/dto'
import { parseSplit } from '@workspace/business'
import {
  createCategorySchema,
  exportCategoriesSchema,
  searchCategoriesSchema,
  suggestCategorySchema,
  updateCategorySchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { csvChunks, pagesOf, type CsvColumn } from '@workspace/business'
import { parseJsonBody } from '../common/validation/parse.js'
import { CATEGORY_CSV_COLUMNS } from '@workspace/business'

const CSV_PAGE_SIZE = 500

export function categoriesRoutes(): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/suggest', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, suggestCategorySchema)

    return context.json(
      await context.var.business.categories.suggest(session.tenant.id, body.description)
    )
  })

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createCategorySchema)

    const row = await context.var.business.categories.create(
      session.tenant.id,
      session.user.id,
      body
    )

    return context.json(toWire(row), 201)
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchCategoriesSchema)

    const { rows, total } = await context.var.business.categories.search(
      session.tenant.id,
      args
    )

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportCategoriesSchema)

    await context.var.business.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'categories', locale: args.locale },
    })

    const read = async (skip: number, limit: number) => {
      const { rows } = await context.var.business.categories.search(session.tenant.id, {
        ...args,
        skip,
        limit,
      })

      return rows.map(toWire)
    }

    return csvResponse(
      CATEGORY_CSV_COLUMNS,
      pagesOf(read, CSV_PAGE_SIZE),
      args.locale,
      'categories'
    )
  })

  router.get('/', async (context) => {
    const session = context.get('session')
    const rows = await context.var.business.categories.listActive(session.tenant.id)

    const refs: CategoryRef[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      defaultSplit: parseSplit(row.defaultSplit),
    }))

    return context.json(refs)
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(
      toWire(await context.var.business.categories.find(session.tenant.id, id))
    )
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateCategorySchema)

    const row = await context.var.business.categories.update(
      session.tenant.id,
      session.user.id,
      body
    )

    return context.json(toWire(row))
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await context.var.business.categories.softDelete(session.tenant.id, session.user.id, id)

    return context.body(null, 204)
  })

  return { router }
}

function toWire(row: {
  id: number
  name: string
  color: string
  defaultSplit: unknown
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    defaultSplit: parseSplit(row.defaultSplit),
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
