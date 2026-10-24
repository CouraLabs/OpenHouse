import type { INestApplication } from '@nestjs/common'
import { getDrizzleToken } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import {
  accounts,
  auditLog,
  categories,
  creditCardStatements,
  goals,
  importMappings,
  limits,
  passwordResetCodes,
  receivers,
  recurringTransactions,
  tenantCodes,
  tenantSettings,
  tenants,
  transactionHistory,
  transactionLinkers,
  transactions,
  users,
} from '@workspace/db'
import type { DataExportJob, ExportManifest } from '@workspace/poco'
import { todayIn } from '@workspace/poco'
import { eq } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import type { App } from 'supertest/types.js'

import { DataExportService } from '../src/data-exports/data-export.service.js'
import { TenantDeletionService } from '../src/tenant-deletion/tenant-deletion.service.js'
import {
  createAccount,
  createCategory,
  joinAsMember,
  signUp,
  startApp,
  type Agent,
} from './support.js'

/** Reads a binary response body. */
function binary(
  res: NodeJS.ReadableStream & {
    on: (e: string, cb: (c: Buffer) => void) => void
  },
  done: (error: Error | null, body: Buffer) => void
): void {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => done(null, Buffer.concat(chunks)))
}

describe('data export and tenant deletion (e2e, #10)', () => {
  let app: INestApplication<App>
  let db: Database

  beforeAll(async () => {
    app = await startApp()
    db = app.get<Database>(getDrizzleToken())
  })

  afterAll(async () => {
    await app.close()
  })

  /** Seeds one row of every entity type a tenant owns. */
  async function seedEverything(owner: Agent) {
    const me = (await owner.get('/auth/me').expect(200)).body
    const tenantId: number = me.tenant.id
    const userId: number = me.user.id
    const currency: string = me.settings.mainCurrency
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
    const receiver = await owner
      .post('/receivers')
      .send({ name: 'Shop', type: 'Service' })
      .expect(201)
    const today = todayIn(me.settings.timezone)

    await owner
      .post('/transactions')
      .send({
        name: 'Lunch',
        amount: '12.00',
        transactionDt: today,
        linkedAccountId: checking,
        categoryId,
        receiverId: receiver.body.id,
        type: 'Expense',
      })
      .expect(201)
    await owner
      .post('/transactions')
      .send({
        name: 'Card charge',
        amount: '30.00',
        transactionDt: today,
        linkedAccountId: card,
        categoryId,
        type: 'Expense',
      })
      .expect(201)
    await owner
      .post('/limits')
      .send({ categoryId, amount: '500.00', type: 'Monthly' })
      .expect(201)
    await owner
      .post('/goals')
      .send({
        name: 'Trip',
        linkedAccountId: savings,
        balance: '0.00',
        balanceDt: today,
        targetBalance: '900.00',
      })
      .expect(201)
    await owner
      .post('/recurring-transactions')
      .send({
        receiverId: receiver.body.id,
        categoryId,
        linkedAccountId: checking,
        amount: '9.90',
        type: 'Expense',
        frequency: 'Monthly',
        frequencyDay: 3,
      })
      .expect(201)
    await owner
      .post('/transaction-linkers')
      .send({ description: 'LUNCH', categoryId })
      .expect(201)
    await owner
      .post('/tenants/invite-codes')
      .send({ expiresInDays: 7 })
      .expect(201)
    await db.insert(importMappings).values({
      tenantId,
      accountId: checking,
      mapping: { any: 'thing' },
      createdBy: userId,
    })

    return { tenantId, userId }
  }

  async function exportZip(owner: Agent, body: object) {
    const created = await owner.post('/data-exports').send(body).expect(201)
    const job: DataExportJob = created.body
    await app.get(DataExportService).settled(job.id)
    const status = await owner.get(`/data-exports/${job.id}`).expect(200)
    expect(status.body.status).toBe('ready')
    const download = await owner
      .get(`/data-exports/${job.id}/download`)
      .buffer(true)
      .parse(binary as never)
      .expect(200)

    return { job, files: unzipSync(new Uint8Array(download.body as Buffer)) }
  }

  it('exports the tenant as a ZIP without secrets, once, owner only', async () => {
    const owner = await signUp(app)
    const { tenantId } = await seedEverything(owner)
    const member = await joinAsMember(app, owner)

    const { job, files } = await exportZip(owner, { scope: 'tenant' })
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

    // The first download deleted the file.
    await owner.get(`/data-exports/${job.id}/download`).expect(404)
    await owner.get(`/data-exports/${job.id}`).expect(404)

    // Members cannot export; the audit log recorded the owner's export.
    await member.agent
      .post('/data-exports')
      .send({ scope: 'tenant' })
      .expect(403)
    await member.agent
      .post('/tenant-deletion')
      .send({ tenantName: 'x' })
      .expect(403)
    await member.agent.delete('/tenant-deletion').expect(403)
    const audit = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenantId))
    expect(audit.map((line) => line.action)).toContain('tenant.export')
  })

  it("exports one member's data, and another tenant's job is invisible", async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const categoryId = await createCategory(member.agent)
    const stranger = await signUp(app)

    const { files } = await exportZip(owner, {
      scope: 'member',
      userId: member.id,
    })
    const profile = JSON.parse(strFromU8(files['user.json']))
    const cats = JSON.parse(strFromU8(files['categories.json']))

    expect(profile[0].email).toBe(member.email)
    expect(cats.map((row: { id: number }) => row.id)).toEqual([categoryId])
    expect(strFromU8(files['user.json'])).not.toContain('password')

    await owner
      .post('/data-exports')
      .send({ scope: 'member', userId: 999999999 })
      .expect(404)
    const job = await owner
      .post('/data-exports')
      .send({ scope: 'tenant' })
      .expect(201)
    await stranger.get(`/data-exports/${job.body.id}`).expect(404)
  })

  it('anonymizes a removed member, keeping the rows they created', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const categoryId = await createCategory(member.agent)

    await owner.post(`/tenants/users/${member.id}/anonymize`).expect(409)
    await owner.post(`/tenants/users/${member.id}/deactivate`).expect(200)
    const anonymized = await owner
      .post(`/tenants/users/${member.id}/anonymize`)
      .expect(200)

    expect(anonymized.body.name).toBe('Former member')
    expect(anonymized.body.email).not.toBe(member.email)
    expect(anonymized.body.anonymizedAt).not.toBeNull()
    await owner.post(`/tenants/users/${member.id}/reactivate`).expect(409)
    const [row] = await db.select().from(users).where(eq(users.id, member.id))
    expect(row.password).toBe('')
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
    expect(category.createdBy).toBe(member.id)
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
      await owner
        .post('/transactions')
        .send({
          name,
          amount,
          transactionDt: '2026-03-05',
          linkedAccountId: account,
          categoryId: category,
          type: 'Expense',
        })
        .expect(201)
    }

    const ptBr = await owner
      .post('/transactions/export')
      .send({
        locale: 'pt-BR',
        sort: [{ field: 'name', dir: 'asc' }],
        filter: { linkedAccountId: account, categoryId },
      })
      .expect(200)
    const enUs = await owner
      .post('/transactions/export')
      .send({ locale: 'en-US', filter: { linkedAccountId: account } })
      .expect(200)

    expect(ptBr.headers['content-type']).toContain('text/csv')
    expect(ptBr.text.startsWith('﻿Date;Name;Type;Amount')).toBe(true)
    expect(ptBr.text).toContain("05/03/2026;'=cmd|calc;")
    expect(ptBr.text).toContain('1234,50')
    expect(ptBr.text).not.toContain('Other')
    expect(enUs.text.startsWith('﻿Date,Name,Type,Amount')).toBe(true)
    expect(enUs.text).toContain('2026-03-05')
    expect(enUs.text).toContain('Other')
  })

  it('schedules, cancels, and carries out the deletion of a tenant with every entity', async () => {
    const owner = await signUp(app)
    const { tenantId } = await seedEverything(owner)
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))

    await owner
      .post('/tenant-deletion')
      .send({ tenantName: 'wrong name' })
      .expect(400)
    const scheduled = await owner
      .post('/tenant-deletion')
      .send({ tenantName: tenant.name })
      .expect(201)
    expect(scheduled.body.deletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(
      (await owner.get('/auth/me').expect(200)).body.tenant.deletionDate
    ).toBe(scheduled.body.deletionDate)
    await owner
      .post('/tenant-deletion')
      .send({ tenantName: tenant.name })
      .expect(409)

    // Not due yet: the job leaves it alone. Cancel, then schedule again.
    expect(await app.get(TenantDeletionService).deleteDue()).toBe(0)
    await owner.delete('/tenant-deletion').expect(204)
    await owner.delete('/tenant-deletion').expect(404)
    await owner
      .post('/tenant-deletion')
      .send({ tenantName: tenant.name })
      .expect(201)

    await db
      .update(tenants)
      .set({ deletionDate: '2000-01-01' })
      .where(eq(tenants.id, tenantId))
    expect(
      await app.get(TenantDeletionService).deleteDue()
    ).toBeGreaterThanOrEqual(1)

    const left = await Promise.all(
      [
        transactionHistory,
        transactions,
        recurringTransactions,
        transactionLinkers,
        goals,
        limits,
        creditCardStatements,
        accounts,
        receivers,
        categories,
        tenantCodes,
        tenantSettings,
        users,
        importMappings,
      ].map((table) =>
        db.select().from(table).where(eq(table.tenantId, tenantId))
      )
    )
    expect(left.map((rows) => rows.length)).toEqual(left.map(() => 0))
    expect(
      await db.select().from(tenants).where(eq(tenants.id, tenantId))
    ).toEqual([])
    expect(await db.select().from(passwordResetCodes).limit(0)).toEqual([])
    const audit = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenantId))
    expect(audit.map((line) => line.action)).toContain('tenant.deleted')
  })
})
