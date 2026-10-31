import type { Session } from '@workspace/domain'
import type { CsvLocale } from '@workspace/dto'
import type { AuditRecorder } from '../ports/audit-recorder.js'
import { csvChunks, pagesOf, type CsvColumn } from './csv.js'

export const CSV_PAGE_SIZE = 500

export interface CsvDownload<Row> {
  session: Session
  entity: string
  locale: CsvLocale
  columns: readonly CsvColumn<Row>[]
  read: (skip: number, size: number) => Promise<Row[]>
}

export interface CsvExport {
  filename: string
  chunks: AsyncGenerator<string>
}

export async function exportCsv<Row>(
  audit: AuditRecorder,
  options: CsvDownload<Row>
): Promise<CsvExport> {
  await audit.record({
    tenantId: options.session.tenant.id,
    actorId: options.session.user.id,
    action: 'csv.export',
    details: { entity: options.entity, locale: options.locale },
  })

  return {
    filename: `${options.entity}.csv`,
    chunks: csvChunks(
      options.columns,
      pagesOf(options.read, CSV_PAGE_SIZE),
      options.locale
    ),
  }
}
