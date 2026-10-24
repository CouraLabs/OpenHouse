import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import type {
  ImportBatch,
  ImportBatchesQuery,
  ImportCommitBody,
  ImportPreview,
  ImportPreviewFields,
  ImportResult,
  ImportUndoResult,
} from '@workspace/poco'
import {
  IMPORT_MAX_BYTES,
  importBatchesQuerySchema,
  importCommitSchema,
  importPreviewFieldsSchema,
} from '@workspace/poco'

import { LedgerConflictFilter } from '../common/ledger/ledger-conflict.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ImportCommitService } from './import-commit.service.js'
import type { UploadedImport } from './import-file.js'
import { ImportPreviewService } from './import-preview.service.js'

/**
 * The attempts one IP may make per minute, when the limits are enforced.
 * Reading a 5 MB file is the heaviest request the API serves, so the preview
 * is the tightest; a commit is one ledger transaction of up to 5,000 rows.
 */
export const PREVIEW_THROTTLE = { default: { limit: 10, ttl: 60_000 } }
export const COMMIT_THROTTLE = { default: { limit: 5, ttl: 60_000 } }

/**
 * The statement import routes: upload a file for a preview, commit the rows
 * the user picked, list the imports that can still be undone, and undo one.
 * Everything reads the tenant and the user from the session — a request names
 * no tenant. The file lives in memory for the length of the request and is
 * never stored.
 */
@Controller('imports')
@UseFilters(LedgerConflictFilter)
export class StatementImportsController {
  constructor(
    private readonly preview: ImportPreviewService,
    private readonly commits: ImportCommitService
  ) {}

  /** Parses an uploaded `.ofx`, `.qfx` or `.csv` into a preview. */
  @Post('preview')
  @Throttle(PREVIEW_THROTTLE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: IMPORT_MAX_BYTES, files: 1, fields: 8 },
    })
  )
  async previewFile(
    @CurrentSession() session: Session,
    @UploadedFile() file: UploadedImport | undefined,
    @Body(new ZodValidationPipe(importPreviewFieldsSchema))
    fields: ImportPreviewFields
  ): Promise<ImportPreview> {
    if (file === undefined) {
      throw new BadRequestException('Upload a .ofx, .qfx or .csv file.')
    }

    return this.preview.preview(session.tenant.id, file, fields)
  }

  /** Inserts the picked rows in one database transaction. */
  @Post('commit')
  @Throttle(COMMIT_THROTTLE)
  async commit(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(importCommitSchema)) body: ImportCommitBody
  ): Promise<ImportResult> {
    return this.commits.commit(session.tenant.id, session.user.id, body)
  }

  /** Lists an account's imports from the last 24 hours that still hold rows. */
  @Get('recent')
  async recent(
    @CurrentSession() session: Session,
    @Query(new ZodValidationPipe(importBatchesQuerySchema))
    query: ImportBatchesQuery
  ): Promise<ImportBatch[]> {
    return this.commits.recent(session.tenant.id, query.accountId)
  }

  /** Soft-deletes a whole batch within 24 hours of its import. */
  @Post('batches/:batchId/undo')
  @HttpCode(HttpStatus.OK)
  @Throttle(COMMIT_THROTTLE)
  async undo(
    @CurrentSession() session: Session,
    @Param('batchId', ParseUUIDPipe) batchId: string
  ): Promise<ImportUndoResult> {
    return this.commits.undo(session.tenant.id, session.user.id, batchId)
  }
}
