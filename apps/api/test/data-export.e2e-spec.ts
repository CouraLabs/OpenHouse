import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { env } from 'cloudflare:workers'

import type { ExportManifest } from '@workspace/dto'
import { todayIn } from '@workspace/business'

import { TestDatabaseHarness } from '@workspace/business/testing'
import {
  type Agent,
  createAccount,
  createCategory,
  joinAsMember,
  signUp,
  startApp,
  turnstileToken,
} from './support.js'

describe('data export and tenant deletion (e2e, #10)', () => {
  // The app is built per spec; the storage is per-test isolated.
  const { app } = startApp()

  /** The tenant's tables, through the isolate's D1 — created per test, the
   * storage being per-test isolated. */
  const harness = new TestDatabaseHarness(env.DB)

  /** Seeds one row of every entity type a tenant owns. */
  async function seedEverything(owner: Agent) {
    const me = await owner.get('/api/auth/me')

    expect(me.status).toBe(200)

    const tenantId: number = me.body.tenant.id
    const userId: number = me.body.user.id
    const currency: string = me.body.settings.mainCurrency
    const checking = await createAccount(owner, { currency })
    const savings = await createAccount(owner, { type: 'Savings', currency })
    const card = await createAccount(owner, {
      type: 'Credit Card',
      agency: null,
      number: null,
      balance: '0.00',
      limit: '5000.00',
      closeDay: 25,
      dueDay: 5,
      currency,
    })
    const categoryId = await createCategory(owner)
    const receiver = await owner.post('/api/receivers', {
      name: 'Shop',
      type: 'Service',
    })

    expect(receiver.status).toBe(201)

    const today = todayIn(me.body.settings.timezone)

    const lunch = await owner.post('/api/transactions', {
      name: 'Lunch',
      amount: '12.00',
      transactionDt: today,
      linkedAccountId: checking,
      categoryId,
      receiverId: receiver.body.id,
      type: 'Expense',
    })

    expect(lunch.status).toBe(201)

    const charge = await owner.post('/api/transactions', {
      name: 'Card charge',
      amount: '30.00',
      transactionDt: today,
      linkedAccountId: card,
      categoryId,
      type: 'Expense',
    })

    expect(charge.status).toBe(201)

    const limit = await owner.post('/api/limits', {
      categoryId,
      amount: '500.00',
      type: 'Monthly',
    })

    expect(limit.status).toBe(201)

    const goal = await owner.post('/api/goals', {
      name: 'Trip',
      linkedAccountId: savings,
      targetBalance: '900.00',
    })

    expect(goal.status).toBe(201)

    const recurring = await owner.post('/api/recurring-transactions', {
      receiverId: receiver.body.id,
      categoryId,
      linkedAccountId: checking,
      amount: '9.90',
      type: 'Expense',
      frequency: 'Monthly',
      frequencyDay: 3,
    })

    expect(recurring.status).toBe(201)

    const linker = await owner.post('/api/transaction-linkers', {
      description: 'LUNCH',
      categoryId,
    })

    expect(linker.status).toBe(201)

    const invite = await owner.post('/api/tenants/invite-codes', {
      turnstileToken: turnstileToken('invite'),
      expiresInDays: 7,
    })

    expect(invite.status).toBe(201)

    await harness.insertImportMapping({
      tenantId,
      accountId: checking,
      mapping: { any: 'thing' },
      createdBy: userId,
    })

    return { tenantId, userId }
  }

  /** Exports and answers the unzipped files: the single POST is the whole
   * export — the ZIP rides the response, nothing is polled or downloaded
   * by id. */
  async function exportZip(
    owner: Agent,
    body: Record<string, unknown>
  ): Promise<Record<string, Uint8Array>> {
    const response = await owner.post('/api/data-exports', body)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/zip')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('cache-control')).toBe('no-store')

    return unzipSync(response.body as Uint8Array)
  }

  it('exports the tenant as a ZIP without secrets, once, owner only', async () => {
    const owner = await signUp(app)
    const { tenantId } = await seedEverything(owner)
    await joinAsMember(app, owner)

    const files = await exportZip(owner, { scope: 'tenant' })
    const manifest = JSON.parse(
      strFromU8(files['manifest.json'])
    ) as ExportManifest

    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.tenantId).toBe(tenantId)
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'tenant.json',
        'settings.json',
        'users.json',
        'accounts.json',
        'categories.json',
        'transactions.json',
        'transaction-history.json',
        'audit-log.json',
      ])
    )
    const everything = Object.values(files)
      .map((f) => strFromU8(f))
      .join('\n')
    expect(everything).not.toMatch(/"password"|refreshTokenHash|\$2[aby]\$/)
    const exportedUsers = JSON.parse(strFromU8(files['users.json']))
    expect(exportedUsers).toHaveLength(2)
    expect(Object.keys(exportedUsers[0])).not.toContain('password')

    // The export is stateless: asking again answers the ZIP again.
    const again = await owner.post('/api/data-exports', { scope: 'tenant' })

    expect(again.status).toBe(200)

    // Members cannot export. The audit log recorded the owner's exports.
    const refused = await joinAsMember(app, owner)

    const forbidden = await refused.agent.post('/api/data-exports', {
      scope: 'tenant',
    })

    expect(forbidden.status).toBe(403)

    expect(await harness.listAuditActions(tenantId)).toContain('tenant.export')
  })

  it("exports one member's data", async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const categoryId = await createCategory(member.agent)

    const files = await exportZip(owner, {
      scope: 'member',
      userId: member.id,
    })
    const profile = JSON.parse(strFromU8(files['user.json']))
    const cats = JSON.parse(strFromU8(files['categories.json']))

    expect(profile[0].email).toBe(member.email)
    expect(cats.map((row: { id: number }) => row.id)).toEqual([categoryId])
    expect(strFromU8(files['user.json'])).not.toContain('password')

    // A user outside the tenant does not exist for the export.
    const unknown = await owner.post('/api/data-exports', {
      scope: 'member',
      userId: 999999999,
    })

    expect(unknown.status).toBe(404)
  })

  it('anonymizes a removed member, keeping the rows they created', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const categoryId = await createCategory(member.agent)

    const active = await owner.post(`/api/tenants/users/${member.id}/anonymize`)

    expect(active.status).toBe(409)

    const removed = await owner.post(
      `/api/tenants/users/${member.id}/deactivate`
    )

    expect(removed.status).toBe(200)

    const anonymized = await owner.post(
      `/api/tenants/users/${member.id}/anonymize`
    )

    expect(anonymized.status).toBe(200)
    expect(anonymized.body.name).toBe('Former member')
    expect(anonymized.body.email).not.toBe(member.email)
    expect(anonymized.body.anonymizedAt).not.toBeNull()

    const restored = await owner.post(
      `/api/tenants/users/${member.id}/reactivate`
    )

    expect(restored.status).toBe(409)

    expect(await harness.findUserPassword(member.id)).toBe('')
    expect(await harness.findCategoryCreatedBy(categoryId)).toBe(member.id)
  })

  it('streams a locale-aware CSV of the filtered view', async () => {
    const owner = await signUp(app)
    const account = await createAccount(owner, { currency: 'BRL' })
    const categoryId = await createCategory(owner)
    const otherCategoryId = await createCategory(owner)
    for (const [name, amount, category] of [
      ['=cmd|calc', '1234.50', categoryId],
      ['Other', '2.00', otherCategoryId],
    ] as const) {
      const created = await owner.post('/api/transactions', {
        name,
        amount,
        transactionDt: '2026-03-05',
        linkedAccountId: account,
        categoryId: category,
        type: 'Expense',
      })

      expect(created.status).toBe(201)
    }

    const ptBr = await owner.post('/api/transactions/export', {
      locale: 'pt-BR',
      sort: [{ field: 'name', dir: 'asc' }],
      filter: { linkedAccountId: account, categoryId },
    })
    const enUs = await owner.post('/api/transactions/export', {
      locale: 'en-US',
      filter: { linkedAccountId: account },
    })

    expect(ptBr.status).toBe(200)
    expect(ptBr.headers.get('content-type')).toContain('text/csv')
    // The file opens with the UTF-8 BOM on the wire; the harness's text
    // decoding strips it, so the assertion reads the header alone.
    expect((ptBr.body as string).startsWith('Date;Name;Type;Amount')).toBe(true)
    expect(ptBr.body).toContain("05/03/2026;'=cmd|calc;")
    expect(ptBr.body).toContain('1234,50')
    expect(ptBr.body).not.toContain('Other')
    expect(enUs.status).toBe(200)
    expect((enUs.body as string).startsWith('Date,Name,Type,Amount')).toBe(true)
    expect(enUs.body).toContain('2026-03-05')
    expect(enUs.body).toContain('Other')
  })

  // The deletion has no HTTP routes in this port: the owner schedules
  // through the service and the queue job carries the deletion out, so the
  // spec drives those two directly — the same units the routes and the
  // cron call.
  it('schedules, cancels, and carries out the deletion of a tenant with every entity', async () => {
    const owner = await signUp(app)
    const { tenantId, userId } = await seedEverything(owner)
    const tenantName = await harness.findTenantName(tenantId)

    const wrong = await owner.post('/api/tenant-deletion', {
      tenantName: 'wrong name',
    })
    expect(wrong.status).toBe(409)

    const scheduledRes = await owner.post('/api/tenant-deletion', {
      tenantName,
    })
    expect(scheduledRes.status).toBe(201)
    const scheduled = scheduledRes.body as {
      deletionDate: string
      deletesOn: string
    }

    expect(scheduled.deletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(scheduled.deletesOn).toBe(scheduled.deletionDate)
    expect((await owner.get('/api/auth/me')).body.tenant.deletionDate).toBe(
      scheduled.deletionDate
    )
    expect(
      (
        await owner.post('/api/tenant-deletion', {
          tenantName,
        })
      ).status
    ).toBe(409)

    await harness.deleteTenantNow(tenantId)
    expect(await harness.countTenantTransactions(tenantId)).toBeGreaterThan(0)

    expect((await owner.delete('/api/tenant-deletion')).status).toBe(204)
    expect((await owner.delete('/api/tenant-deletion')).status).toBe(404)
    await harness.scheduleTenantDeletion(tenantId, userId, tenantName)

    await harness.setTenantDeletionDate(tenantId, '2000-01-01')
    await harness.deleteTenantNow(tenantId)

    const left = await harness.countRemainingTenantRows(tenantId)
    expect(left).toEqual(left.map(() => 0))
    expect(await harness.tenantExists(tenantId)).toBe(false)
    expect(await harness.listAuditActions(tenantId)).toContain('tenant.deleted')
  })
})
