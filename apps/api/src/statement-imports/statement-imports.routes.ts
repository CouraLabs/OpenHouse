import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import {
  IMPORT_COMMIT_MAX_BYTES,
  importBatchesQuerySchema,
  importCommitSchema,
  importPreviewFieldsSchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { BadRequestError } from '@workspace/business'
import { parseJsonBody, parseQuery } from '../common/validation/parse.js'

const batchIdSchema = z.string().uuid()

export function statementImportsRoutes(): { router: App } {
  const router = new Hono<AppEnv>()

  router.post('/preview', async (context) => {
    const session = context.get('session')
    const { file, fields } = await readUpload(context)

    return context.json(
      await context.var.business.importPreview.preview(session.tenant.id, file, fields),
      201
    )
  })

  router.post(
    '/commit',
    bodyLimit({
      maxSize: IMPORT_COMMIT_MAX_BYTES,
      onError: (context) =>
        context.json(
          {
            message: 'The commit is too large.',
            error: 'Payload Too Large',
            statusCode: 413,
          },
          413
        ),
    }),
    async (context) => {
      const session = context.get('session')
      const body = await parseJsonBody(context, importCommitSchema)

      return context.json(
        await context.var.business.importCommits.commit(session.tenant.id, session.user.id, body),
        201
      )
    }
  )

  router.get('/recent', async (context) => {
    const session = context.get('session')
    const query = parseQuery(context, importBatchesQuerySchema)

    return context.json(
      await context.var.business.importCommits.recent(session.tenant.id, query.accountId)
    )
  })

  router.post('/batches/:batchId/undo', async (context) => {
    const session = context.get('session')
    const batchId = batchIdSchema.safeParse(context.req.param('batchId'))

    if (!batchId.success) {
      throw new BadRequestError(batchId.error.issues)
    }

    return context.json(
      await context.var.business.importCommits.undo(session.tenant.id, session.user.id, batchId.data)
    )
  })

  return { router }
}

async function readUpload(context: import('hono').Context<AppEnv>): Promise<{
  file: { originalname: string; bytes: Uint8Array; size: number }
  fields: import('@workspace/dto').ImportPreviewFields
}> {
  const form = await context.req.parseBody()
  const file = form.file

  if (!(file instanceof File)) {
    throw new BadRequestError('Upload a .ofx, .qfx or .csv file.')
  }

  const fields: Record<string, string> = {}
  for (const [name, value] of Object.entries(form)) {
    if (typeof value === 'string') {
      fields[name] = value
    }
  }

  const parsed = importPreviewFieldsSchema.safeParse(fields)

  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues)
  }

  return {
    file: {
      originalname: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      size: file.size,
    },
    fields: parsed.data,
  }
}
