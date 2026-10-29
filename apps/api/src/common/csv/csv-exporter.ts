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
 * Builds the response every `POST <entity>/export` route answers with. The
 * rows are read page by page while the response is written, so a large
 * range never sits in memory, and every export is recorded in the audit
 * log. This is the shared helper the features' routes files should call —
 * several of them still carry an inline copy of the response builder from
 * the port, which this file replaces.
 */
export async function csvDownload<Row>(
  audit: AuditRecorder,
  options: CsvDownload<Row>
): Promise<Response> {
  await audit.record({
    tenantId: options.session.tenant.id,
    actorId: options.session.user.id,
    action: 'csv.export',
    details: { entity: options.entity, locale: options.locale },
  })

  return csvResponse(
    options.entity,
    csvChunks(
      options.columns,
      pagesOf(options.read, CSV_PAGE_SIZE),
      options.locale
    )
  )
}

/** The response of a CSV download: the file, streamed page by page, with
 * the content type and file name the previous framework set. */
export function csvResponse(entity: string, chunks: AsyncGenerator<string>): Response {
  const encoder = new TextEncoder()
  const iterator = chunks[Symbol.asyncIterator]()

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(encoder.encode(value))
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${entity}.csv"`,
    },
  })
}
