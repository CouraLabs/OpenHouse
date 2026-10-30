import { Hono } from 'hono'
import { createDataExportSchema } from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { DataExportService } from './data-export.service.js'

export function dataExportsRoutes(deps: {
  exports: DataExportService
}): { router: App } {
  const router = new Hono<AppEnv>()

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
