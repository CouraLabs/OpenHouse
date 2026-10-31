import type {
  Account,
  AccountRepository,
  CategoryRepository,
  ImportMappingRepository,
  ImportTransactionRepository,
  ReceiverRepository,
  TransactionLinkerRepository,
} from '@workspace/db'
import {
  IMPORT_DUPLICATE_DAYS,
  IMPORT_MAX_BYTES,
  importMappingSchema,
  type ImportMapping,
  type ImportPreview,
  type ImportPreviewFields,
  type ImportPreviewRow,
} from '@workspace/dto'

import { cardCycleOf, resolveStatement } from '../calc/credit-card-cycle.js'
import { addDays } from '../calc/dates.js'
import { BadRequestError, NotFoundError } from '../errors.js'
import {
  findProbableDuplicate,
  indexByAmount,
  type ExistingRow,
} from './import-duplicates.js'
import {
  readCsvFile,
  readOfxFile,
  type ReadFile,
} from './import-file-reader.js'
import { formatOfUpload, type UploadedImport } from './import-file.js'
import {
  detectInstallmentMarker,
  isBillPaymentDescription,
} from './statement-imports.js'
import { buildSuggester } from './import-suggestions.js'
import type { ParsedImportRow } from './parsed-import.js'

export class ImportPreviewService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly linkers: TransactionLinkerRepository,
    private readonly imports: ImportTransactionRepository,
    private readonly mappings: ImportMappingRepository
  ) {}

  async preview(
    tenantId: number,
    file: UploadedImport,
    fields: ImportPreviewFields
  ): Promise<ImportPreview> {
    const account = await this.activeAccount(tenantId, fields.accountId)

    if (file.size > IMPORT_MAX_BYTES || file.bytes.length > IMPORT_MAX_BYTES) {
      throw new BadRequestError('An import file is at most 5 MB.')
    }

    const format = formatOfUpload(file.originalname)
    const { read, mapping } =
      format === 'ofx'
        ? { read: readOfxFile(file.bytes), mapping: null }
        : await this.readCsv(tenantId, account.id, file, fields)
    assertCurrency(read.currencies, account)

    const base = {
      format,
      currency: read.currencies.length === 0 ? null : account.currency,
      encoding: read.encoding,
      isCard: account.type === 'Credit Card',
      headers: read.headers,
      sample: read.sample,
      mapping,
    }

    if (read.parsed === null) {
      return {
        ...base,
        needsMapping: true,
        rows: [],
        invalidCount: 0,
        invalid: [],
      }
    }

    return {
      ...base,
      needsMapping: false,
      rows: await this.enrich(tenantId, account, read.parsed.rows),
      invalidCount: read.parsed.invalidCount,
      invalid: read.parsed.invalid,
    }
  }

  private async readCsv(
    tenantId: number,
    accountId: number,
    file: UploadedImport,
    fields: ImportPreviewFields
  ): Promise<{ read: ReadFile; mapping: ImportMapping | null }> {
    const stored = importMappingSchema.safeParse(
      await this.mappings.findStored(tenantId, accountId)
    )
    const saved = stored.success ? stored.data : undefined
    const mapping = fields.mapping ?? (fields.remap ? undefined : saved)

    return {
      read: readCsvFile(file.bytes, {
        mapping,
        encoding: fields.encoding ?? saved?.encoding ?? 'auto',
        delimiter: fields.delimiter ?? saved?.delimiter ?? 'auto',
      }),
      mapping: mapping ?? saved ?? null,
    }
  }

  private async enrich(
    tenantId: number,
    account: Account,
    parsed: readonly ParsedImportRow[]
  ): Promise<ImportPreviewRow[]> {
    const [categories, receivers, linkers] = await Promise.all([
      this.categories.listActive(tenantId),
      this.receivers.listActive(tenantId),
      this.linkers.listActive(tenantId),
    ])
    const suggest = buildSuggester({ categories, receivers, linkers })
    const categoryName = new Map(categories.map((row) => [row.id, row.name]))
    const receiverName = new Map(receivers.map((row) => [row.id, row.name]))

    const byExternalId = await this.imports.findByExternalIds(
      tenantId,
      account.id,
      parsed.flatMap((row) => (row.externalId === null ? [] : [row.externalId]))
    )
    const pool = await this.duplicatePool(tenantId, account.id, parsed)
    const cycle = account.type === 'Credit Card' ? cardCycleOf(account) : null
    const isCard = account.type === 'Credit Card'

    return parsed.map((row, index) => {
      const suggestion = suggest(row)
      const sameBankId =
        row.externalId === null ? undefined : byExternalId.get(row.externalId)
      const similar =
        sameBankId === undefined ? findProbableDuplicate(row, pool) : undefined
      const marker =
        isCard && cycle !== null && row.type === 'Expense'
          ? detectInstallmentMarker(row.name)
          : null

      return {
        index,
        name: row.name,
        amount: row.amount,
        type: row.type,
        transactionDt: row.transactionDt,
        externalId: row.externalId,
        pending: row.pending,
        categoryId: suggestion.categoryId,
        categoryName:
          suggestion.categoryId === null
            ? null
            : (categoryName.get(suggestion.categoryId) ?? null),
        receiverId: suggestion.receiverId,
        receiverName:
          suggestion.receiverId === null
            ? null
            : (receiverName.get(suggestion.receiverId) ?? null),
        suggestionSource: suggestion.source,
        duplicate: this.flag(sameBankId ?? similar, sameBankId !== undefined),
        billPayment:
          isCard &&
          row.type === 'Income' &&
          (row.paymentHint || isBillPaymentDescription(row.name)),
        statement:
          cycle === null ? null : resolveStatement(cycle, row.transactionDt),
        installment:
          marker === null
            ? null
            : { number: marker.number, count: marker.count },
      }
    })
  }

  private async duplicatePool(
    tenantId: number,
    accountId: number,
    parsed: readonly ParsedImportRow[]
  ): Promise<Map<string, ExistingRow[]>> {
    if (parsed.length === 0) {
      return new Map()
    }

    const days = parsed.map((row) => row.transactionDt).sort()

    return indexByAmount(
      await this.imports.findInWindow(
        tenantId,
        accountId,
        addDays(days[0], -IMPORT_DUPLICATE_DAYS),
        addDays(days[days.length - 1], IMPORT_DUPLICATE_DAYS)
      )
    )
  }

  private flag(
    existing: ExistingRow | undefined,
    external: boolean
  ): ImportPreviewRow['duplicate'] {
    if (existing === undefined) {
      return null
    }

    return {
      kind: external ? 'external' : 'probable',
      transactionId: existing.id,
      name: existing.name,
      transactionDt: existing.transactionDt,
      amount: existing.amount,
    }
  }

  private async activeAccount(
    tenantId: number,
    accountId: number
  ): Promise<Account> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${accountId}.`)
    }

    return account
  }
}

function assertCurrency(declared: readonly string[], account: Account): void {
  const other = declared.find((currency) => currency !== account.currency)

  if (other !== undefined) {
    throw new BadRequestError(
      `This file is in ${other}, but the account is in ${account.currency}.`
    )
  }
}
