import { Hono } from 'hono'
import { createDataExportSchema } from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function dataExportsRoutes(): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, createDataExportSchema)
    const { bytes, fileName } = await context.var.business.dataExports.export(
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
