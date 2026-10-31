import {
  type ImportCommitRow,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
  type Transaction,
} from '@workspace/dto'
import { describe, expect, it } from 'vitest'

import {
  BANK_OFX_SGML,
  CARD_OFX_XML,
  FOREIGN_OFX,
} from '@workspace/business/testing'
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
  // The app is built per spec; the storage is per-test isolated.
  const { app } = startApp()

  /** The bytes of a Windows-1252 file: the code page whose code points are
   * these strings' char codes. */
  const bytesOf = (text: string) => Buffer.from(text, 'latin1')

  const ofx = bytesOf(BANK_OFX_SGML)

  // Storage isolates per test: every test signs its own tenant in.
  const aTenant = async () => {
    const agent = await signUp(app)
    return { agent, categoryId: await createCategory(agent) }
  }

  const bankAccount = (agent: Agent) =>
    createAccount(agent, { currency: 'BRL', balance: '1000.00' })

  const card = (agent: Agent) =>
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

  /** Uploads a file for a preview, raw — the status is the caller's to
   * assert. */
  async function preview(
    agent: Agent,
    accountId: number,
    content: Buffer,
    fileName: string,
    fields: Record<string, string> = {}
  ) {
    const form = new FormData()
    form.append('accountId', String(accountId))

    for (const [name, value] of Object.entries(fields)) {
      form.append(name, value)
    }

    form.append('file', new File([new Uint8Array(content)], fileName))

    return agent.form('/api/imports/preview', form)
  }

  /** Uploads a file and answers the preview, asserting the 201. */
  async function previewOk(
    agent: Agent,
    accountId: number,
    content: Buffer,
    fileName: string,
    fields: Record<string, string> = {}
  ): Promise<ImportPreview> {
    const response = await preview(agent, accountId, content, fileName, fields)

    expect(response.status, JSON.stringify(response.body)).toBe(201)

    return response.body
  }

  /** The commit row a preview row becomes when the user keeps it. The
   * caller names the test's own category. */
  const keep = (row: ImportPreviewRow, extra: Partial<ImportCommitRow> = {}) =>
    ({
      name: row.name,
      amount: row.amount,
      type: row.type,
      transactionDt: row.transactionDt,
      externalId: row.externalId,
      categoryId: row.categoryId,
      receiverId: row.receiverId,
      status: row.pending ? 'Verify' : 'Checked',
      ...extra,
    }) as ImportCommitRow

  async function commit(
    agent: Agent,
    accountId: number,
    rows: ImportCommitRow[],
    extra: Record<string, unknown> = {}
  ): Promise<ImportResult> {
    const response = await agent.post('/api/imports/commit', {
      accountId,
      rows,
      ...extra,
    })

    expect(response.status, JSON.stringify(response.body)).toBe(201)

    return response.body
  }

  async function rowsOf(
    agent: Agent,
    accountId: number
  ): Promise<Transaction[]> {
    const response = await agent.post('/api/transactions/search', {
      filter: { linkedAccountId: accountId },
      limit: 100,
    })

    expect(response.status).toBe(201)

    return response.body.items
  }

  it('imports an OFX file once: the same file again adds nothing', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)
    const first = await previewOk(agent, account, ofx, 'statement.ofx')

    expect(first.format).toBe('ofx')
    expect(first.currency).toBe('BRL')
    expect(first.rows).toHaveLength(3)
    expect(first.rows.every((row) => row.duplicate === null)).toBe(true)

    const result = await commit(
      agent,
      account,
      first.rows.map((row) => keep(row, { categoryId }))
    )

    expect(result).toMatchObject({ imported: 3, skippedDuplicates: 0 })
    expect(await rowsOf(agent, account)).toHaveLength(3)
    // 1000 - 45.90 + 3500.00 - 1234.56
    expect(await balanceOf(agent, account)).toBe('3219.54')

    const second = await previewOk(agent, account, ofx, 'statement.ofx')

    expect(second.rows.map((row) => row.duplicate?.kind)).toEqual([
      'external',
      'external',
      'external',
    ])

    const again = await commit(
      agent,
      account,
      second.rows.map((row) => keep(row, { categoryId }))
    )

    expect(again).toMatchObject({
      imported: 0,
      skippedDuplicates: 3,
      batchId: null,
    })
    expect(await rowsOf(agent, account)).toHaveLength(3)
    expect(await balanceOf(agent, account)).toBe('3219.54')
  })

  it('reads Windows-1252 accents correctly and stores the bank id', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)
    const read = await previewOk(agent, account, ofx, 'statement.ofx')

    expect(read.encoding).toBe('windows-1252')

    await commit(
      agent,
      account,
      read.rows.map((row) => keep(row, { categoryId }))
    )

    const names = (await rowsOf(agent, account)).map((row) => row.name).sort()

    expect(names).toEqual(['AÇOUGUE & CIA', 'PADARIA PÃO QUENTE', 'SALÁRIO'])
  })

  it('undoes a batch within 24 hours and lets the same file import again', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)
    const read = await previewOk(agent, account, ofx, 'statement.ofx')
    const result = await commit(
      agent,
      account,
      read.rows.map((row) => keep(row, { categoryId }))
    )

    const recent = await agent.get(`/api/imports/recent?accountId=${account}`)

    expect(recent.status).toBe(200)
    expect(recent.body).toHaveLength(1)
    expect(recent.body[0]).toMatchObject({ batchId: result.batchId, count: 3 })

    const undone = await agent.post(
      `/api/imports/batches/${result.batchId}/undo`
    )

    expect(undone.status).toBe(200)
    expect(undone.body).toEqual({ undone: 3 })
    expect(await balanceOf(agent, account)).toBe('1000.00')
    expect(await rowsOf(agent, account)).toHaveLength(0)
    expect(
      (await agent.get(`/api/imports/recent?accountId=${account}`)).body
    ).toEqual([])

    // The partial unique index only holds ACTIVE rows, so the deleted
    // batch does not block importing the same bank ids again.
    const reread = await previewOk(agent, account, ofx, 'statement.ofx')

    expect(reread.rows.every((row) => row.duplicate === null)).toBe(true)
    expect(
      await commit(
        agent,
        account,
        reread.rows.map((row) => keep(row, { categoryId }))
      )
    ).toMatchObject({ imported: 3, skippedDuplicates: 0 })
    expect(await balanceOf(agent, account)).toBe('3219.54')

    // Undoing the first batch again is harmless: nothing live is left in it.
    const harmless = await agent.post(
      `/api/imports/batches/${result.batchId}/undo`
    )

    expect(harmless.status).toBe(200)
    expect(harmless.body).toEqual({ undone: 0 })

    const unknown = await agent.post(
      '/api/imports/batches/00000000-0000-4000-8000-000000000000/undo'
    )

    expect(unknown.status).toBe(404)
  })

  it('rejects a file in another currency than the account', async () => {
    const { agent } = await aTenant()
    const account = await bankAccount(agent)

    const foreign = await preview(
      agent,
      account,
      bytesOf(FOREIGN_OFX),
      'gbp.ofx'
    )

    expect(foreign.status).toBe(400)
    expect(foreign.body.message).toMatch(/GBP/)

    // The same BRL file on a dollar account is refused as well.
    const usd = await createAccount(agent, { currency: 'USD' })
    const mismatched = await preview(agent, usd, ofx, 'statement.ofx')

    expect(mismatched.status).toBe(400)
  })

  it('maps a CSV once and reuses the mapping next time', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)
    const csv = bytesOf(
      'Data;Descrição;Valor\n05/01/2026;MERCADO EXTRA;-1.234,56\n06/01/2026;SALÁRIO;5.000,00\n'
    )

    const unmapped = await previewOk(agent, account, csv, 'extrato.csv')

    expect(unmapped.needsMapping).toBe(true)
    expect(unmapped.headers).toEqual(['Data', 'Descrição', 'Valor'])
    expect(unmapped.mapping).toBeNull()
    expect(unmapped.encoding).toBe('windows-1252')

    const mapped = await previewOk(agent, account, csv, 'extrato.csv', {
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
      agent,
      account,
      mapped.rows.map((row) => keep(row, { categoryId })),
      {
        mapping: CSV_MAPPING,
      }
    )

    // A later upload needs no mapping: the saved one applies.
    const next = await previewOk(
      agent,
      account,
      bytesOf('Data;Descrição;Valor\n07/01/2026;PADARIA;-10,00\n'),
      'outro.csv'
    )

    expect(next.needsMapping).toBe(false)
    expect(next.mapping).toMatchObject({ dateFormat: 'DD/MM/YYYY' })
    expect(next.rows).toHaveLength(1)

    // Asking to map again returns the headers with the saved mapping to
    // prefill the form.
    const remap = await previewOk(agent, account, csv, 'extrato.csv', {
      remap: 'true',
    })

    expect(remap.needsMapping).toBe(true)
    expect(remap.mapping).toMatchObject({ decimalSeparator: ',' })
  })

  it('flags a probable duplicate on the same amount, nearby day, and description', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)

    const created = await agent.post('/api/transactions', {
      name: 'Mercado Extra 0042',
      amount: '1234.56',
      transactionDt: '2026-01-04',
      linkedAccountId: account,
      categoryId,
      type: 'Expense',
    })

    expect(created.status).toBe(201)

    const csv = bytesOf(
      'Data;Descrição;Valor\n05/01/2026;MERCADO EXTRA;-1.234,56\n05/01/2026;POSTO;-1.234,56\n'
    )
    const read = await previewOk(agent, account, csv, 'extrato.csv', {
      mapping: JSON.stringify(CSV_MAPPING),
    })

    expect(read.rows[0].duplicate).toMatchObject({ kind: 'probable' })
    expect(read.rows[1].duplicate).toBeNull()

    // Flagged, not skipped: committing it still imports the row.
    expect(
      await commit(agent, account, [keep(read.rows[0], { categoryId })])
    ).toMatchObject({
      imported: 1,
      skippedDuplicates: 0,
    })
  })

  it('previews a card OFX with the CCSTMTRS sign convention, bills, and installments', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await card(agent)
    const read = await previewOk(
      agent,
      account,
      Buffer.from(CARD_OFX_XML, 'utf8'),
      'fatura.ofx'
    )

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
      agent,
      account,
      read.rows
        .filter((row) => !row.billPayment)
        .map((row) => keep(row, { categoryId, installment: row.installment }))
    )

    expect(result.imported).toBe(3)

    const stored = await rowsOf(agent, account)
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
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)
    const row = {
      name: 'LOJA X PARC 03/10',
      amount: '10.00',
      type: 'Expense',
      transactionDt: '2026-01-05',
      categoryId,
      status: 'Checked',
    }

    const installment = await agent.post('/api/imports/commit', {
      accountId: account,
      rows: [{ ...row, installment: { number: 3, count: 10 } }],
    })

    expect(installment.status).toBe(409)

    const unknownCategory = await agent.post('/api/imports/commit', {
      accountId: account,
      rows: [{ ...row, categoryId: 999999999 }],
    })

    expect(unknownCategory.status).toBe(404)
  })

  it('asks before importing into a reconciled period', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await bankAccount(agent)

    const reconciled = await agent.post(`/api/reconciliation/${account}`, {
      date: '2026-01-10',
      bankBalance: '1000.00',
    })

    expect(reconciled.status).toBe(200)

    const read = await previewOk(agent, account, ofx, 'statement.ofx')
    const rows = read.rows.map((row) => keep(row, { categoryId }))
    const refused = await agent.post('/api/imports/commit', {
      accountId: account,
      rows,
    })

    expect(refused.status).toBe(409)
    expect(refused.body.reconciledThrough).toBe('2026-01-10')

    const confirmed = await commit(agent, account, rows, {
      confirmReconciled: true,
    })

    expect(confirmed).toMatchObject({ imported: 3 })
  })

  it('is atomic: a failing row rolls the whole file back', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await createAccount(agent, {
      currency: 'BRL',
      balance: '0.00',
    })
    const huge = (amount: string) =>
      ({
        name: 'Huge',
        amount,
        type: 'Income',
        transactionDt: '2026-01-05',
        categoryId,
        status: 'Checked',
      }) as ImportCommitRow
    // The second row carries more money than the exact cents range holds
    // (±2^53 cents), so its write fails after the first one was planned.
    const failed = await agent.post('/api/imports/commit', {
      accountId: account,
      rows: [huge('50000000000000.00'), huge('99999999999999.99')],
    })

    expect(failed.status).toBeGreaterThanOrEqual(400)
    expect(await rowsOf(agent, account)).toHaveLength(0)
    expect(await balanceOf(agent, account)).toBe('0.00')
  })

  it('imports a file past one chunk of 500 rows in one go', async () => {
    const { agent, categoryId } = await aTenant()
    const account = await createAccount(agent, {
      currency: 'BRL',
      balance: '0.00',
    })
    const rows = Array.from({ length: 1200 }, (_, index) => ({
      name: `Row ${index}`,
      amount: '1.00',
      type: 'Income',
      transactionDt: '2026-01-05',
      categoryId,
      status: 'Checked',
    }))
    const result = await commit(agent, account, rows as ImportCommitRow[])

    expect(result.imported).toBe(1200)
    expect(await balanceOf(agent, account)).toBe('1200.00')
  }, 60_000)

  it('caps a file at 5 MB and 5,000 rows', async () => {
    const { agent } = await aTenant()
    const account = await bankAccount(agent)

    const oversized = await preview(
      agent,
      account,
      Buffer.alloc(5 * 1024 * 1024 + 1, 97),
      'big.csv'
    )

    expect(oversized.status).toBe(400)

    const csv = `Data;Descrição;Valor\n${'05/01/2026;A;-1,00\n'.repeat(5001)}`
    const many = await preview(
      agent,
      account,
      Buffer.from(csv, 'utf8'),
      'many.csv'
    )

    expect(many.status).toBe(400)

    const row = {
      name: 'A',
      amount: '1.00',
      type: 'Expense',
      transactionDt: '2026-01-05',
      categoryId: 1,
      status: 'Checked',
    }
    const tooManyRows = await agent.post('/api/imports/commit', {
      accountId: account,
      rows: Array.from({ length: 5001 }, () => row),
    })

    expect(tooManyRows.status).toBe(400)
  })

  it('refuses other file types and missing files', async () => {
    const { agent } = await aTenant()
    const account = await bankAccount(agent)

    const text = await preview(
      agent,
      account,
      Buffer.from('x', 'utf8'),
      'notes.txt'
    )

    expect(text.status).toBe(400)

    const fileless = await preview(agent, account, Buffer.alloc(0), '')

    expect(fileless.status).toBe(400)
  })

  it('never reaches another tenant’s account', async () => {
    const { agent } = await aTenant()
    const other = await signUp(app)
    const account = await bankAccount(agent)

    const foreign = await preview(other, account, ofx, 'statement.ofx')

    expect(foreign.status).toBe(404)
  })
})
