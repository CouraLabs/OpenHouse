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

/**
 * The bill routes: a bill is opened by the first charge that lands on it,
 * and its totals and status are derived — the only writes are the figures
 * typed in from the bank's bill and the reconciliation. The session names
 * the tenant; a bill's charges and payments are listed through
 * `POST transactions/search` with `filter.statementId` or
 * `filter.paymentStatementId`, and a payment is a transfer into the card
 * (`POST transactions/transfer` with `paymentStatementId`).
 */
export function creditCardStatementRoutes(deps: {
  statements: CreditCardStatementService
}): App {
  const router: App = new Hono<AppEnv>()

  /** Searches the tenant's bills, paged, sorted and filtered. */
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

  /** Reads one bill with its totals and status. */
  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(await deps.statements.find(session.tenant.id, id))
  })

  /** Writes the minimum payment and total typed in from the bank's bill. */
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

  /** Reconciles a bill with the bank's total: 409 with the bill's own
   * total while they differ. */
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
