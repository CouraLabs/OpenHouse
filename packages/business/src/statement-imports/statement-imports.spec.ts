import { describe, expect, it } from 'vitest'
import {
  importCommitSchema,
  importMappingSchema,
  importPreviewFieldsSchema,
} from '@workspace/dto'
import {
  descriptionSimilarity,
  detectInstallmentMarker,
  isBillPaymentDescription,
  normalizeImportText,
  parseImportDate,
  parseLocalizedAmount,
  withinDays,
} from './statement-imports.js'

describe('parseLocalizedAmount', () => {
  it('reads Brazilian numbers with a comma decimal separator', () => {
    expect(parseLocalizedAmount('1.234,56', ',')).toBe('1234.56')
    expect(parseLocalizedAmount('-1.234.567,8', ',')).toBe('-1234567.80')
    expect(parseLocalizedAmount('R$ 12,3', ',')).toBe('12.30')
    expect(parseLocalizedAmount('1234,56', ',')).toBe('1234.56')
    expect(parseLocalizedAmount('1.234', ',')).toBe('1234.00')
  })

  it('reads US numbers with a dot decimal separator', () => {
    expect(parseLocalizedAmount('1,234.56', '.')).toBe('1234.56')
    expect(parseLocalizedAmount('-$1,234,567.8', '.')).toBe('-1234567.80')
    expect(parseLocalizedAmount('1234.56', '.')).toBe('1234.56')
    expect(parseLocalizedAmount('1,234', '.')).toBe('1234.00')
  })

  it('refuses text that the chosen separator would misread', () => {
    expect(parseLocalizedAmount('1234.56', ',')).toBeNull()
    expect(parseLocalizedAmount('1234,56', '.')).toBeNull()
    expect(parseLocalizedAmount('12.34.56', ',')).toBeNull()
    expect(parseLocalizedAmount('abc', ',')).toBeNull()
    expect(parseLocalizedAmount('', '.')).toBeNull()
    expect(parseLocalizedAmount('1,234567', ',')).toBeNull()
  })

  it('reads the sign written before, after, or in parentheses', () => {
    expect(parseLocalizedAmount('-12,34', ',')).toBe('-12.34')
    expect(parseLocalizedAmount('12,34-', ',')).toBe('-12.34')
    expect(parseLocalizedAmount('(12,34)', ',')).toBe('-12.34')
    expect(parseLocalizedAmount('+12,34', ',')).toBe('12.34')
    expect(parseLocalizedAmount('-0,00', ',')).toBe('0.00')
  })

  it('never goes through a float', () => {
    expect(parseLocalizedAmount('0,1', ',')).toBe('0.10')
    expect(parseLocalizedAmount('99999999999999,99', ',')).toBe(
      '99999999999999.99'
    )
  })
})

describe('parseImportDate', () => {
  it('reads the three date formats', () => {
    expect(parseImportDate('05/01/2026', 'DD/MM/YYYY')).toBe('2026-01-05')
    expect(parseImportDate('01/05/2026', 'MM/DD/YYYY')).toBe('2026-01-05')
    expect(parseImportDate('2026-01-05', 'YYYY-MM-DD')).toBe('2026-01-05')
  })

  it('ignores a time and accepts other separators and short years', () => {
    expect(parseImportDate('05/01/2026 14:30', 'DD/MM/YYYY')).toBe('2026-01-05')
    expect(parseImportDate('2026-01-05T10:00:00', 'YYYY-MM-DD')).toBe(
      '2026-01-05'
    )
    expect(parseImportDate('5.1.26', 'DD/MM/YYYY')).toBe('2026-01-05')
  })

  it('refuses days that do not exist or the wrong format', () => {
    expect(parseImportDate('31/02/2026', 'DD/MM/YYYY')).toBeNull()
    expect(parseImportDate('13/13/2026', 'MM/DD/YYYY')).toBeNull()
    expect(parseImportDate('2026-01-05', 'DD/MM/YYYY')).toBeNull()
    expect(parseImportDate('', 'YYYY-MM-DD')).toBeNull()
  })
})

describe('description similarity', () => {
  it('normalizes to lowercase letters without accents or digits', () => {
    expect(normalizeImportText('  PÃO de Açúcar 1234 - SP ')).toBe(
      'pao de acucar sp'
    )
  })

  it('scores the same merchant high and a different one low', () => {
    expect(
      descriptionSimilarity('SUPERMERCADO EXTRA 0123', 'Supermercado Extra')
    ).toBeGreaterThan(0.9)
    expect(
      descriptionSimilarity('Supermercado Extra', 'Posto Ipiranga')
    ).toBeLessThan(0.4)
    expect(descriptionSimilarity('', '')).toBe(1)
  })

  it('measures a day window', () => {
    expect(withinDays('2026-01-05', '2026-01-07', 2)).toBe(true)
    expect(withinDays('2026-01-07', '2026-01-05', 2)).toBe(true)
    expect(withinDays('2026-01-05', '2026-01-08', 2)).toBe(false)
  })
})

describe('detectInstallmentMarker', () => {
  it('finds PARC markers and the merchant they belong to', () => {
    expect(detectInstallmentMarker('LOJA X PARC 03/10')).toEqual({
      number: 3,
      count: 10,
      merchant: 'loja x',
    })
    expect(detectInstallmentMarker('Loja X Parcela 3 de 10')).toMatchObject({
      number: 3,
      count: 10,
      merchant: 'loja x',
    })
    expect(detectInstallmentMarker('LOJA X PARC.03-10')).toMatchObject({
      number: 3,
      count: 10,
    })
  })

  it('finds a trailing n/m marker', () => {
    expect(detectInstallmentMarker('LOJA X 3/10')).toEqual({
      number: 3,
      count: 10,
      merchant: 'loja x',
    })
  })

  it('does not read dates or impossible markers as installments', () => {
    expect(detectInstallmentMarker('COMPRA 12/05')).toBeNull()
    expect(detectInstallmentMarker('LOJA X 1/1')).toBeNull()
    expect(detectInstallmentMarker('LOJA X 3/99')).toBeNull()
    expect(detectInstallmentMarker('LOJA X 3/10 MAIS TEXTO')).toBeNull()
    expect(detectInstallmentMarker('LOJA X')).toBeNull()
  })

  it('gives the rows of one purchase the same merchant', () => {
    expect(detectInstallmentMarker('LOJA X PARC 03/10')?.merchant).toBe(
      detectInstallmentMarker('LOJA X PARC 04/10')?.merchant
    )
  })
})

describe('isBillPaymentDescription', () => {
  it('recognizes card bill payments', () => {
    expect(isBillPaymentDescription('Pagamento recebido')).toBe(true)
    expect(isBillPaymentDescription('PAGTO FATURA 04/2026')).toBe(true)
    expect(isBillPaymentDescription('PAGAMENTO DE FATURA')).toBe(true)
    expect(isBillPaymentDescription('Payment Received - Thank you')).toBe(true)
    expect(isBillPaymentDescription('Supermercado Extra')).toBe(false)
  })
})

describe('import contracts', () => {
  const mapping = {
    hasHeader: true,
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    signConvention: 'negativeIsExpense',
    encoding: 'auto',
    delimiter: 'auto',
  }

  it('accepts a single amount column or a debit and credit pair', () => {
    expect(importMappingSchema.safeParse(mapping).success).toBe(true)
    expect(
      importMappingSchema.safeParse({
        ...mapping,
        amountColumn: undefined,
        debitColumn: 2,
        creditColumn: 3,
      }).success
    ).toBe(true)
  })

  it('refuses a mapping with no amount', () => {
    const result = importMappingSchema.safeParse({
      ...mapping,
      amountColumn: undefined,
      debitColumn: 2,
    })

    expect(result.success).toBe(false)
  })

  it('reads the preview mapping from JSON text', () => {
    const fields = importPreviewFieldsSchema.parse({
      accountId: '7',
      mapping: JSON.stringify(mapping),
    })

    expect(fields.accountId).toBe(7)
    expect(fields.mapping?.dateColumn).toBe(0)
    expect(importPreviewFieldsSchema.parse({ accountId: '7' }).mapping).toBe(
      undefined
    )
    expect(
      importPreviewFieldsSchema.safeParse({ accountId: '7', mapping: '{' })
        .success
    ).toBe(false)
  })

  it('caps a commit at 5,000 rows and checks installment markers', () => {
    const row = {
      name: 'Loja',
      amount: '10.00',
      type: 'Expense',
      transactionDt: '2026-01-05',
      categoryId: 1,
      status: 'Checked',
    }

    expect(
      importCommitSchema.safeParse({ accountId: 1, rows: [row] }).success
    ).toBe(true)
    expect(
      importCommitSchema.safeParse({
        accountId: 1,
        rows: Array.from({ length: 5001 }, () => row),
      }).success
    ).toBe(false)
    expect(
      importCommitSchema.safeParse({
        accountId: 1,
        rows: [{ ...row, installment: { number: 11, count: 10 } }],
      }).success
    ).toBe(false)
    expect(
      importCommitSchema.safeParse({
        accountId: 1,
        rows: [{ ...row, amount: '10.123' }],
      }).success
    ).toBe(false)
  })
})
