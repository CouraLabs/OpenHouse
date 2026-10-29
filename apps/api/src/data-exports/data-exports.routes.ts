import { Hono } from 'hono'
import { createDataExportSchema } from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { DataExportService } from './data-export.service.js'

/**
 * The full-export route, owner-only, in one request: the ZIP is built in
 * memory and answers the same POST — no job to poll, no file on disk, no
 * download link to expire. The tenant always comes from the session.
 */
export function dataExportsRoutes(deps: {
  exports: DataExportService
}): { router: App } {
  const router = new Hono<AppEnv>()

  /** Exports the tenant — or one member's data — and answers the ZIP. */
  router.post('/', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createDataExportSchema)
    const { bytes, fileName } = await deps.exports.export(
      session.tenant.id,
      session.user.id,
      body
    )

    return new Response(bytes as BodyInit, {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'no-store',
      },
    })
  })

  return { router }
}
