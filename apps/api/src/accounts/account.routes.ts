import { Hono } from 'hono'
import type {
  Account,
  AccountOwnership,
  AccountRef,
  AccountType,
  Currency,
  EntityStatus,
} from '@workspace/poco'
import {
  availableLimit,
  createAccountSchema,
  deleteAccountQuerySchema,
  exportAccountsSchema,
  searchAccountsSchema,
  updateAccountSchema,
} from '@workspace/poco'

import type { AuditRecorder } from '../common/audit/audit-recorder.js'
import type { App, AppEnv } from '../common/context.js'
import { csvChunks, pagesOf } from '../common/csv/csv.js'
import { parseJsonBody, parseQuery } from '../common/validation/parse.js'
import { ACCOUNT_CSV_COLUMNS } from './account-csv.js'
import type { AccountService } from './account.service.js'

const CSV_PAGE_SIZE = 500

export function accountRoutes(deps: {
  accounts: AccountService
  audit: AuditRecorder
}): App {
  const router: App = new Hono<AppEnv>()

  router.post('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createAccountSchema)

    return context.json(
      toWire(
        await deps.accounts.create(session.tenant.id, session.user.id, body)
      ),
      201
    )
  })

  router.post('/search', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, searchAccountsSchema)

    const { rows, total } = await deps.accounts.search(session.tenant.id, args)

    return context.json({ total, items: rows.map(toWire) }, 201)
  })

  router.post('/export', async (context) => {
    const session = context.get('session')
    const args = await parseJsonBody(context, exportAccountsSchema)

    await deps.audit.record({
      tenantId: session.tenant.id,
      actorId: session.user.id,
      action: 'csv.export',
      details: { entity: 'accounts', locale: args.locale },
    })

    const chunks = csvChunks(
      ACCOUNT_CSV_COLUMNS,
      pagesOf(async (skip, size) => {
        const { rows } = await deps.accounts.search(session.tenant.id, {
          ...args,
          skip,
          limit: size,
        })

        return rows.map(toWire)
      }, CSV_PAGE_SIZE),
      args.locale
    )

    return csvResponse(chunks, 'accounts')
  })

  router.get('/', async (context) => {
    const session = context.get('session')
    const rows = await deps.accounts.listActive(session.tenant.id)

    return context.json(
      rows.map((row): AccountRef => ({
        id: row.id,
        name: row.name,
        type: row.type,
        currency: row.currency,
        isDefault: row.isDefault,
        ownership: row.ownership,
        closeDay: row.closeDay,
        dueDay: row.dueDay,
        closeDayInclusive: row.closeDayInclusive,
        availableLimit: availableLimit(row),
        balance: row.balance,
      }))
    )
  })

  router.get('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(toWire(await deps.accounts.find(session.tenant.id, id)))
  })

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updateAccountSchema)

    return context.json(
      toWire(
        await deps.accounts.update(session.tenant.id, session.user.id, body)
      )
    )
  })

  router.delete('/:id', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)
    const query = parseQuery(context, deleteAccountQuerySchema)

    await deps.accounts.softDelete(
      session.tenant.id,
      session.user.id,
      id,
      query.confirmUnpaidBills
    )

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
  agency: string | null
  number: string | null
  type: AccountType
  balance: string
  openingBalance: string
  openingDt: string
  reconciledThrough: string | null
  currency: Currency
  spreadPct: string
  limit: string | null
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  isDefault: boolean
  ownership: AccountOwnership
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Account {
  return {
    id: row.id,
    name: row.name,
    agency: row.agency,
    number: row.number,
    type: row.type,
    balance: row.balance,
    openingBalance: row.openingBalance,
    openingDt: row.openingDt,
    reconciledThrough: row.reconciledThrough,
    currency: row.currency,
    spreadPct: row.spreadPct,
    limit: row.limit,
    availableLimit: availableLimit(row),
    closeDay: row.closeDay,
    dueDay: row.dueDay,
    closeDayInclusive: row.closeDayInclusive,
    isDefault: row.isDefault,
    ownership: row.ownership,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
