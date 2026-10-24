import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common'
import {
  createDataExportSchema,
  type CreateDataExportBody,
  type DataExportJob,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import type { Session } from '../common/session/session.js'
import { CurrentSession, Roles } from '../common/session/session.js'
import { DataExportService } from './data-export.service.js'

/**
 * The full-export routes, owner-only: start a job, poll it, download the
 * ZIP once. The tenant always comes from the session.
 */
@Roles('owner')
@Controller('data-exports')
export class DataExportsController {
  constructor(private readonly exports: DataExportService) {}

  /** Starts an export of the tenant, or of one member's data. */
  @Post()
  create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createDataExportSchema))
    body: CreateDataExportBody
  ): Promise<DataExportJob> {
    return this.exports.create(session.tenant.id, session.user.id, body)
  }

  /** Reads a job: pending, ready, or failed. */
  @Get(':id')
  get(
    @CurrentSession() session: Session,
    @Param('id') id: string
  ): Promise<DataExportJob> {
    return this.exports.get(session.tenant.id, id)
  }

  /** Downloads a ready ZIP; the file is deleted afterwards. */
  @Get(':id/download')
  download(
    @CurrentSession() session: Session,
    @Param('id') id: string
  ): Promise<StreamableFile> {
    return this.exports.download(session.tenant.id, id)
  }
}
