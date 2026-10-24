import { Injectable, StreamableFile } from '@nestjs/common'
import { Readable } from 'node:stream'
import type { CsvLocale } from '@workspace/poco'

import { AuditRecorder } from '../audit/audit-recorder.js'
import type { Session } from '../session/session.js'
import { csvChunks, pagesOf, type CsvColumn } from './csv.js'

/** How many rows one page of an export reads. */
export const CSV_PAGE_SIZE = 500

/** What a feature hands the exporter to build its download. */
export interface CsvDownload<Row> {
  session: Session
  /** The entity exported, e.g. `transactions` — names the file and the
   * audit line. */
  entity: string
  locale: CsvLocale
  columns: readonly CsvColumn<Row>[]
  /** Reads `size` rows after `skip` of the search the client asked for. */
  read: (skip: number, size: number) => Promise<Row[]>
}

/**
 * Builds the streamed CSV every `POST <entity>/export` route answers with.
 * The rows are read page by page while the response is written, so a large
 * range never sits in memory and never passes through the browser's JS
 * before the download starts. Every export is recorded in the audit log.
 */
@Injectable()
export class CsvExporter {
  constructor(private readonly audit: AuditRecorder) {}

  async download<Row>(options: CsvDownload<Row>): Promise<StreamableFile> {
    await this.audit.record({
      tenantId: options.session.tenant.id,
      actorId: options.session.user.id,
      action: 'csv.export',
      details: { entity: options.entity, locale: options.locale },
    })

    const chunks = csvChunks(
      options.columns,
      pagesOf(options.read, CSV_PAGE_SIZE),
      options.locale
    )

    return new StreamableFile(Readable.from(chunks), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${options.entity}.csv"`,
    })
  }
}
