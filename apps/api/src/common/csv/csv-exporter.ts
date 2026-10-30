import type { CsvLocale } from '@workspace/poco'

import { AuditRecorder } from '../audit/audit-recorder.js'
import type { Session } from '../session/session.js'
import { csvChunks, pagesOf, type CsvColumn } from './csv.js'

export const CSV_PAGE_SIZE = 500

export interface CsvDownload<Row> {
  session: Session
  entity: string
  locale: CsvLocale
  columns: readonly CsvColumn<Row>[]
  read: (skip: number, size: number) => Promise<Row[]>
}

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
