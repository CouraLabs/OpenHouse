import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import {
  IMPORT_COMMIT_MAX_BYTES,
  importBatchesQuerySchema,
  importCommitSchema,
  importPreviewFieldsSchema,
} from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { BadRequestError } from '../common/errors.js'
import { parseJsonBody, parseQuery } from '../common/validation/parse.js'
import type { ImportCommitService } from './import-commit.service.js'
import type { ImportPreviewService } from './import-preview.service.js'

/** The `batchId` path parameter the undo route takes. */
const batchIdSchema = z.string().uuid()

/**
 * The statement import routes: upload a file for a preview, commit the rows
 * the user picked, list the imports that can still be undone, and undo one.
 * Everything reads the tenant and the user from the session — a request
 * names no tenant. The uploaded file lives in memory for the length of the
 * request and is never stored.
 *
 * The commit route carries the body limit: its rows can reach
 * `IMPORT_COMMIT_MAX_BYTES`, far over Hono's default. The preview's file
 * size limit lives in the preview service, on the parsed file.
 */
export function statementImportsRoutes(deps: {
  preview: ImportPreviewService
  commits: ImportCommitService
}): { router: App } {
  const router = new Hono<AppEnv>()

  /** Parses an uploaded `.ofx`, `.qfx` or `.csv` into a preview. */
  router.post('/preview', async (context) => {
    const session = context.get('session')
    const { file, fields } = await readUpload(context)

    return context.json(
      await deps.preview.preview(session.tenant.id, file, fields),
      201
    )
  })

  /** Inserts the picked rows, in ledger batches of 500. */
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
        await deps.commits.commit(session.tenant.id, session.user.id, body),
        201
      )
    }
  )

  /** Lists an account's imports from the last 24 hours that still hold
   * rows. */
  router.get('/recent', async (context) => {
    const session = context.get('session')
    const query = parseQuery(context, importBatchesQuerySchema)

    return context.json(
      await deps.commits.recent(session.tenant.id, query.accountId)
    )
  })

  /** Soft-deletes a whole batch within 24 hours of its import. */
  router.post('/batches/:batchId/undo', async (context) => {
    const session = context.get('session')
    const batchId = batchIdSchema.safeParse(context.req.param('batchId'))

    if (!batchId.success) {
      throw new BadRequestError(batchId.error.issues)
    }

    return context.json(
      await deps.commits.undo(
        session.tenant.id,
        session.user.id,
        batchId.data
      )
    )
  })

  return { router }
}

/**
 * Reads the preview's multipart body: the `file` part, and the text fields
 * — `accountId` and, for a CSV, the mapping and its overrides. The fields
 * ride as form values, so they are validated against the poco schema
 * directly, which is written for them.
 */
async function readUpload(
  context: import('hono').Context<AppEnv>
): Promise<{
  file: { originalname: string; bytes: Uint8Array; size: number }
  fields: import('@workspace/poco').ImportPreviewFields
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
