import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { CreditCardStatement, PagedResults } from '@workspace/dto'
import {
  reconcileStatementSchema,
  searchStatementsSchema,
  statementBankFiguresSchema,
} from '@workspace/dto'

export function creditCardStatementRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchStatementsSchema)

    const { rows, total } = await context.var.business.statements.search(
      session.tenant.id,
      args
    )

    return context.json<PagedResults<CreditCardStatement>>(
      { total, items: rows },
      201
    )
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(
      await context.var.business.statements.find(session.tenant.id, id)
    )
  })

  router.patch('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)
    const body = await parseJsonBody(context, statementBankFiguresSchema)

    return context.json(
      await context.var.business.statements.updateBankFigures(
        session.tenant.id,
        session.user.id,
        id,
        body
      )
    )
  })

  router.post('/:id/reconcile/preview', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)
    const body = await parseJsonBody(context, reconcileStatementSchema)

    return context.json(
      await context.var.business.statements.previewReconcile(
        session.tenant.id,
        id,
        body
      )
    )
  })

  router.post('/:id/reconcile', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)
    const body = await parseJsonBody(context, reconcileStatementSchema)

    return context.json(
      await context.var.business.statements.reconcile(
        session.tenant.id,
        session.user.id,
        id,
        body
      ),
      201
    )
  })

  return router
}
