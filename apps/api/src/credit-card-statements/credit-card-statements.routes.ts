import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type {
  CreditCardStatement,
  PagedResults,
} from '@workspace/poco'
import {
  reconcileStatementSchema,
  searchStatementsSchema,
  statementBankFiguresSchema,
} from '@workspace/poco'
import type { CreditCardStatementService } from './credit-card-statement.service.js'

export function creditCardStatementRoutes(deps: {
  statements: CreditCardStatementService
}): App {
  const router: App = new Hono<AppEnv>()

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchStatementsSchema)

    const { rows, total } = await deps.statements.search(
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

    return context.json(await deps.statements.find(session.tenant.id, id))
  })

  router.patch('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)
    const body = await parseJsonBody(context, statementBankFiguresSchema)

    return context.json(
      await deps.statements.updateBankFigures(
        session.tenant.id,
        session.user.id,
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
      await deps.statements.reconcile(
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
