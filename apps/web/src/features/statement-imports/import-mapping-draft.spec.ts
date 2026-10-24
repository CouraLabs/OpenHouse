import { describe, expect, it } from 'vitest'

import { draftToMapping, initialDraft } from './import-mapping-draft.js'

describe('initialDraft', () => {
  it('guesses the columns from Brazilian headers', () => {
    const draft = initialDraft(['Data', 'Histórico', 'Valor', 'Status'], null)

    expect(draft).toMatchObject({
      dateColumn: '0',
      descriptionColumn: '1',
      amountLayout: 'single',
      amountColumn: '2',
      pendingColumn: '3',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
    })
  })

  it('guesses separate debit and credit columns', () => {
    const draft = initialDraft(['Data', 'Descrição', 'Débito', 'Crédito'], null)

    expect(draft).toMatchObject({
      amountLayout: 'split',
      debitColumn: '2',
      creditColumn: '3',
    })
  })

  it('restores the saved mapping', () => {
    const saved = {
      hasHeader: false,
      dateColumn: 2,
      descriptionColumn: 0,
      amountColumn: 1,
      debitColumn: null,
      creditColumn: null,
      categoryColumn: null,
      pendingColumn: null,
      dateFormat: 'MM/DD/YYYY',
      decimalSeparator: '.',
      signConvention: 'positiveIsExpense',
      encoding: 'windows-1252',
      delimiter: ';',
    } as const

    const draft = initialDraft([], saved)

    expect(draft).toMatchObject({
      hasHeader: false,
      dateColumn: '2',
      amountLayout: 'single',
      decimalSeparator: '.',
    })
    expect(draftToMapping(draft)).toEqual({ ok: true, mapping: saved })
  })
})

describe('draftToMapping', () => {
  it('reports what the poco schema rejects', () => {
    const result = draftToMapping({
      ...initialDraft(['Foo', 'Bar'], null),
      amountLayout: 'single',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        'dateColumn',
        'descriptionColumn',
      ])
    }
  })

  it('asks for the amount once the other columns are set', () => {
    const result = draftToMapping({
      ...initialDraft(['Data', 'Descrição'], null),
      amountLayout: 'single',
    })

    expect(result).toMatchObject({
      ok: false,
      errors: { amountColumn: expect.any(String) },
    })
  })

  it('builds a split mapping', () => {
    const result = draftToMapping({
      ...initialDraft(['Data', 'Descrição', 'Débito', 'Crédito'], null),
    })

    expect(result).toMatchObject({
      ok: true,
      mapping: {
        amountColumn: null,
        debitColumn: 2,
        creditColumn: 3,
      },
    })
  })
})
