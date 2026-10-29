import { Hono } from 'hono'
import type {
  EntityStatus,
  TransactionLinker,
} from '@workspace/poco'
import {
  createTransactionLinkerSchema,
  searchTransactionLinkersSchema,
  updateTransactionLinkerSchema,
} from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { TransactionLinkerService } from './transaction-linker.service.js'

/**
 * The transaction linker routes. Everything here reads the tenant and the
 * user from the session, so a client can only ever see or act on its own
 * tenant — the request names no tenant anywhere. Every signed-in role
 * manages linkers.
 */
export function transactionLinkersRoutes(deps: {
  linkers: TransactionLinkerService
}): { router: App } {
  const router = new Hono<AppEnv>()

  /** Creates a linker for the tenant. */
  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createTransactionLinkerSchema)

    return context.json(
      toWire(await deps.linkers.create(session.tenant.id, session.user.id, body)),
      201
    )
  })

  /** Searches the tenant's linkers, paged, sorted and filtered. */
  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchTransactionLinkersSchema)

    const { rows, total } = await deps.linkers.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  /** Reads one linker, deleted rows included. */
  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.linkers.find(session.tenant.id, id)))
  })

  /** Updates a linker. */
  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateTransactionLinkerSchema)

    return context.json(
      toWire(await deps.linkers.update(session.tenant.id, session.user.id, body))
    )
  })

  /** Soft-deletes a linker: its status becomes DELETED. */
  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.linkers.softDelete(session.tenant.id, session.user.id, id)

    return context.body(null, 204)
  })

  return { router }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
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
