import { Hono } from 'hono'
import type { EntityStatus, TransactionLinker } from '@workspace/dto'
import {
  createTransactionLinkerSchema,
  searchTransactionLinkersSchema,
  updateTransactionLinkerSchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function transactionLinkersRoutes(): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createTransactionLinkerSchema)

    return context.json(
      toWire(
        await context.var.business.transactionLinkers.create(session.tenant.id, session.user.id, body)
      ),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionLinkersSchema)

    const { rows, total } = await context.var.business.transactionLinkers.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await context.var.business.transactionLinkers.find(session.tenant.id, id)))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateTransactionLinkerSchema)

    return context.json(
      toWire(
        await context.var.business.transactionLinkers.update(session.tenant.id, session.user.id, body)
      )
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await context.var.business.transactionLinkers.softDelete(session.tenant.id, session.user.id, id)

    return context.body(null, 204)
  })

  return { router }
}

function toWire(row: {
  id: number
  description: string
  categoryId: number
  categoryName: string
  receiverId: number | null
  receiverName: string | null
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): TransactionLinker {
  return {
    id: row.id,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
