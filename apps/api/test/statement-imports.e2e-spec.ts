import type { INestApplication } from '@nestjs/common'
import {
  type ImportCommitRow,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
  type Transaction,
} from '@workspace/poco'
import type { App } from 'supertest/types.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BANK_OFX_SGML,
  CARD_OFX_XML,
  FOREIGN_OFX,
} from '../src/statement-imports/ofx-samples.fixture-spec.js'
import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

const CSV_MAPPING = {
  hasHeader: true,
  dateColumn: 0,
  descriptionColumn: 1,
  amountColumn: 2,
  categoryColumn: null,
  pendingColumn: null,
  dateFormat: 'DD/MM/YYYY',
  decimalSeparator: ',',
  signConvention: 'negativeIsExpense',
  encoding: 'auto',
  delimiter: 'auto',
}

describe('statement imports (e2e, #9)', () => {
  let app: INestApplication<App>
  let agent: Agent
  let categoryId: number

  beforeAll(async () => {
    app = await startApp()
    agent = await signUp(app)
    categoryId = await createCategory(agent)
  })

  afterAll(async () => {
    await app.close()
  })

  const bankAccount = () =>
    createAccount(agent, { currency: 'BRL', balance: '1000.00' })

  const card = () =>
    createAccount(agent, {
      type: 'Credit Card',
      agency: null,
      number: null,
      balance: '0.00',
      limit: '5000.00',
      currency: 'BRL',
      closeDay: 25,
      dueDay: 5,
    })

  /** Uploads a file for a preview. */
  async function preview(
    accountId: number,
    content: Buffer,
    fileName: string,
    fields: Record<string, string> = {}
  ): Promise<ImportPreview> {
    let call = agent
      .post('/imports/preview')
      .field('accountId', String(accountId))

    for (const [name, value] of Object.entries(fields)) {
      call = call.field(name, value)
    }

    const response = await call.attach('file', content, fileName).expect(201)

    return response.body
  }

  /** The commit row a preview row becomes when the user keeps it. */
  const keep = (row: ImportPreviewRow, extra: Partial<ImportCommitRow> = {}) =>
    ({
      name: row.name,
      amount: row.amount,
      type: row.type,
      transactionDt: row.transactionDt,
      externalId: row.externalId,
      categoryId: row.categoryId ?? categoryId,
      receiverId: row.receiverId,
      status: row.pending ? 'Verify' : 'Checked',
      ...extra,
    }) as ImportCommitRow

  async function commit(
    accountId: number,
    rows: ImportCommitRow[],
    extra: Record<string, unknown> = {}
  ): Promise<ImportResult> {
    const response = await agent
      .post('/imports/commit')
      .send({ accountId, rows, ...extra })
      .expect(201)

    return response.body
  }

  async function rowsOf(accountId: number): Promise<Transaction[]> {
    const response = await agent
      .post('/transactions/search')
      .send({ filter: { linkedAccountId: accountId }, limit: 100 })
      .expect(201)

    return response.body.items
  }

  const ofx = Buffer.from(BANK_OFX_SGML, 'latin1')

  it('imports an OFX file once: the same file again adds nothing', async () => {
    const account = await bankAccount()
    const first = await preview(account, ofx, 'statement.ofx')

    expect(first.format).toBe('ofx')
    expect(first.currency).toBe('BRL')
    expect(first.rows).toHaveLength(3)
    expect(first.rows.every((row) => row.duplicate === null)).toBe(true)

    const result = await commit(
      account,
      first.rows.map((row) => keep(row))
    )

    expect(result).toMatchObject({ imported: 3, skippedDuplicates: 0 })
    expect(await rowsOf(account)).toHaveLength(3)
    // 1000 - 45.90 + 3500.00 - 1234.56
    expect(await balanceOf(agent, account)).toBe('3219.54')

    const second = await preview(account, ofx, 'statement.ofx')

    expect(second.rows.map((row) => row.duplicate?.kind)).toEqual([
      'external',
      'external',
      'external',
    ])

    const again = await commit(
      account,
      second.rows.map((row) => keep(row))
    )

    expect(again).toMatchObject({
      imported: 0,
      skippedDuplicates: 3,
      batchId: null,
    })
    expect(await rowsOf(account)).toHaveLength(3)
    expect(await balanceOf(agent, account)).toBe('3219.54')
  })

  it('reads Windows-1252 accents correctly and stores the bank id', async () => {
    const account = await bankAccount()
    const read = await preview(account, ofx, 'statement.ofx')

    expect(read.encoding).toBe('windows-1252')

    await commit(
      account,
      read.rows.map((row) => keep(row))
    )

    const names = (await rowsOf(account)).map((row) => row.name).sort()

    expect(names).toEqual(['AÇOUGUE & CIA', 'PADARIA PÃO QUENTE', 'SALÁRIO'])
  })

  it('undoes a batch within 24 hours and lets the same file import again', async () => {
    const account = await bankAccount()
    const read = await preview(account, ofx, 'statement.ofx')
    const result = await commit(
      account,
      read.rows.map((row) => keep(row))
    )

    const recent = await agent
      .get('/imports/recent')
      .query({ accountId: account })
      .expect(200)

    expect(recent.body).toHaveLength(1)
    expect(recent.body[0]).toMatchObject({ batchId: result.batchId, count: 3 })

    const undone = await agent
      .post(`/imports/batches/${result.batchId}/undo`)
      .expect(200)

    expect(undone.body).toEqual({ undone: 3 })
    expect(await balanceOf(agent, account)).toBe('1000.00')
    expect(await rowsOf(account)).toHaveLength(0)
    expect(
      (await agent.get('/imports/recent').query({ accountId: account })).body
    ).toEqual([])

    // The partial unique index only holds ACTIVE rows, so the deleted
    // batch does not block importing the same bank ids again.
    const reread = await preview(account, ofx, 'statement.ofx')

    expect(reread.rows.every((row) => row.duplicate === null)).toBe(true)
    expect(
      await commit(
        account,
        reread.rows.map((row) => keep(row))
      )
    ).toMatchObject({ imported: 3, skippedDuplicates: 0 })
    expect(await balanceOf(agent, account)).toBe('3219.54')

    // Undoing the first batch again is harmless: nothing live is left in it.
    await agent
      .post(`/imports/batches/${result.batchId}/undo`)
      .expect(200)
      .expect({ undone: 0 })
    await agent
      .post('/imports/batches/00000000-0000-4000-8000-000000000000/undo')
      .expect(404)
  })

  it('rejects a file in another currency than the account', async () => {
    const account = await bankAccount()
    const response = await agent
      .post('/imports/preview')
      .field('accountId', String(account))
      .attach('file', Buffer.from(FOREIGN_OFX, 'latin1'), 'gbp.ofx')
      .expect(400)

    expect(response.body.message).toMatch(/GBP/)

    // The same BRL file on a dollar account is refused as well.
    const usd = await createAccount(agent, { currency: 'USD' })

    await agent
      .post('/imports/preview')
      .field('accountId', String(usd))
      .attach('file', ofx, 'statement.ofx')
      .expect(400)
  })

  it('maps a CSV once and reuses the mapping next time', async () => {
    const account = await bankAccount()
    const csv = Buffer.from(
      'Data;Descrição;Valor\n05/01/2026;MERCADO EXTRA;-1.234,56\n06/01/2026;SALÁRIO;5.000,00\n',
      'latin1'
    )

    const unmapped = await preview(account, csv, 'extrato.csv')

    expect(unmapped.needsMapping).toBe(true)
    expect(unmapped.headers).toEqual(['Data', 'Descrição', 'Valor'])
    expect(unmapped.mapping).toBeNull()
    expect(unmapped.encoding).toBe('windows-1252')

    const mapped = await preview(account, csv, 'extrato.csv', {
      mapping: JSON.stringify(CSV_MAPPING),
    })

    expect(mapped.needsMapping).toBe(false)
    expect(
      mapped.rows.map((row) => [row.transactionDt, row.amount, row.type])
    ).toEqual([
      ['2026-01-05', '1234.56', 'Expense'],
      ['2026-01-06', '5000.00', 'Income'],
    ])
    expect(mapped.rows[1].name).toBe('SALÁRIO')

    await commit(
      account,
      mapped.rows.map((row) => keep(row)),
      {
        mapping: CSV_MAPPING,
      }
    )

    // A later upload needs no mapping: the saved one applies.
    const next = await preview(
      account,
      Buffer.from(
        'Data;Descrição;Valor\n07/01/2026;PADARIA;-10,00\n',
        'latin1'
      ),
      'outro.csv'
    )

    expect(next.needsMapping).toBe(false)
    expect(next.mapping).toMatchObject({ dateFormat: 'DD/MM/YYYY' })
    expect(next.rows).toHaveLength(1)

    // Asking to map again returns the headers with the saved mapping to
    // prefill the form.
    const remap = await preview(account, csv, 'extrato.csv', { remap: 'true' })

    expect(remap.needsMapping).toBe(true)
    expect(remap.mapping).toMatchObject({ decimalSeparator: ',' })
  })

  it('flags a probable duplicate on the same amount, nearby day, and description', async () => {
    const account = await bankAccount()

    await agent
      .post('/transactions')
      .send({
        name: 'Mercado Extra 0042',
        amount: '1234.56',
        transactionDt: '2026-01-04',
        linkedAccountId: account,
        categoryId,
        type: 'Expense',
      })
      .expect(201)

    const csv = Buffer.from(
      'Data;Descrição;Valor\n05/01/2026;MERCADO EXTRA;-1.234,56\n05/01/2026;POSTO;-1.234,56\n'
    )
    const read = await preview(account, csv, 'extrato.csv', {
      mapping: JSON.stringify(CSV_MAPPING),
    })

    expect(read.rows[0].duplicate).toMatchObject({ kind: 'probable' })
    expect(read.rows[1].duplicate).toBeNull()

    // Flagged, not skipped: committing it still imports the row.
    expect(await commit(account, [keep(read.rows[0])])).toMatchObject({
      imported: 1,
      skippedDuplicates: 0,
    })
  })

  it('previews a card OFX with the CCSTMTRS sign convention, bills, and installments', async () => {
    const account = await card()
    const read = await preview(account, Buffer.from(CARD_OFX_XML), 'fatura.ofx')

    expect(read.isCard).toBe(true)
    expect(read.rows.map((row) => [row.type, row.amount])).toEqual([
      ['Expense', '89.90'],
      ['Expense', '250.00'],
      ['Income', '30.00'],
      ['Income', '1500.00'],
    ])
    expect(read.rows.map((row) => row.billPayment)).toEqual([
      false,
      false,
      false,
      true,
    ])
    expect(read.rows[1].installment).toEqual({ number: 3, count: 10 })
    expect(read.rows[0].installment).toBeNull()
    // Closes on the 25th: a charge on Jan 12 lands on the bill closing Jan 25.
    expect(read.rows[0].statement).toEqual({
      periodStart: '2025-12-25',
      closeDate: '2026-01-25',
      dueDate: '2026-02-05',
    })

    // The user skips the bill payment and links the installment.
    const result = await commit(
      account,
      read.rows
        .filter((row) => !row.billPayment)
        .map((row) => keep(row, { installment: row.installment }))
    )

    expect(result.imported).toBe(3)

    const stored = await rowsOf(account)
    const installment = stored.find((row) => row.installmentNumber === 3)

    expect(stored.every((row) => row.statementId !== null)).toBe(true)
    expect(installment).toMatchObject({
      installmentCount: 10,
      statementDueDate: '2026-02-05',
    })
    expect(installment?.installmentGroupId).toEqual(expect.any(String))
    // 250 + 89.90 charged, 30 refunded: owed 309.90.
    expect(await balanceOf(agent, account)).toBe('-309.90')
  })

  it('refuses an installment link off a card, and an unknown category', async () => {
    const account = await bankAccount()
    const row = {
      name: 'LOJA X PARC 03/10',
      amount: '10.00',
      type: 'Expense',
      transactionDt: '2026-01-05',
      categoryId,
      status: 'Checked',
    }

    await agent
      .post('/imports/commit')
      .send({
        accountId: account,
        rows: [{ ...row, installment: { number: 3, count: 10 } }],
      })
      .expect(409)
    await agent
      .post('/imports/commit')
      .send({ accountId: account, rows: [{ ...row, categoryId: 999999999 }] })
      .expect(404)
  })

  it('asks before importing into a reconciled period', async () => {
    const account = await bankAccount()

    await agent
      .post(`/reconciliation/${account}`)
      .send({ date: '2026-01-10', bankBalance: '1000.00' })
      .expect(200)

    const read = await preview(account, ofx, 'statement.ofx')
    const rows = read.rows.map((row) => keep(row))
    const refused = await agent
      .post('/imports/commit')
      .send({ accountId: account, rows })
      .expect(409)

    expect(refused.body.reconciledThrough).toBe('2026-01-10')
    expect(
      await commit(account, rows, { confirmReconciled: true })
    ).toMatchObject({ imported: 3 })
  })

  it('is atomic: a failing row rolls the whole file back', async () => {
    const account = await createAccount(agent, {
      currency: 'BRL',
      balance: '0.00',
    })
    const huge = (index: number) =>
      ({
        name: `Huge ${index}`,
        amount: '50000000000000.00',
        type: 'Income',
        transactionDt: '2026-01-05',
        categoryId,
        status: 'Checked',
      }) as ImportCommitRow
    // Two of these overflow the account's numeric(16,2) balance on the
    // second row, after the first one was already written.
    const failed = await agent
      .post('/imports/commit')
      .send({ accountId: account, rows: [huge(1), huge(2)] })

    expect(failed.status).toBeGreaterThanOrEqual(400)
    expect(await rowsOf(account)).toHaveLength(0)
    expect(await balanceOf(agent, account)).toBe('0.00')
  })

  it('imports a file past one chunk of 500 rows in one go', async () => {
    const account = await createAccount(agent, {
      currency: 'BRL',
      balance: '0.00',
    })
    const rows = Array.from({ length: 1200 }, (_, index) => ({
      name: `Row ${index}`,
      amount: '1.00',
      type: 'Income',
      transactionDt: '2026-01-05',
      externalId: `bulk-${index}`,
      categoryId,
      status: 'Checked',
    }))
    const result = await commit(account, rows as ImportCommitRow[])

    expect(result.imported).toBe(1200)
    expect(await balanceOf(agent, account)).toBe('1200.00')
  }, 60_000)

  it('caps a file at 5 MB and 5,000 rows', async () => {
    const account = await bankAccount()

    await agent
      .post('/imports/preview')
      .field('accountId', String(account))
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1, 'a'), 'big.csv')
      .expect(413)

    const csv = `Data;Descrição;Valor\n${'05/01/2026;A;-1,00\n'.repeat(5001)}`

    await agent
      .post('/imports/preview')
      .field('accountId', String(account))
      .attach('file', Buffer.from(csv), 'many.csv')
      .expect(413)

    const row = {
      name: 'A',
      amount: '1.00',
      type: 'Expense',
      transactionDt: '2026-01-05',
      categoryId,
      status: 'Checked',
    }

    await agent
      .post('/imports/commit')
      .send({
        accountId: account,
        rows: Array.from({ length: 5001 }, () => row),
      })
      .expect(400)
  })

  it('refuses other file types and missing files', async () => {
    const account = await bankAccount()

    await agent
      .post('/imports/preview')
      .field('accountId', String(account))
      .attach('file', Buffer.from('x'), 'notes.txt')
      .expect(400)
    await agent
      .post('/imports/preview')
      .field('accountId', String(account))
      .expect(400)
  })

  it('never reaches another tenant’s account', async () => {
    const other = await signUp(app)
    const account = await bankAccount()

    await other
      .post('/imports/preview')
      .field('accountId', String(account))
      .attach('file', ofx, 'statement.ofx')
      .expect(404)
  })
})
