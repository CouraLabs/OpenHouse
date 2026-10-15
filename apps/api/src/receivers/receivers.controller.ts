import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common'
import type {
  CreateReceiverBody,
  EntityStatus,
  PagedResults,
  Receiver,
  ReceiverRef,
  ReceiverType,
  SearchReceiversArgs,
  UpdateReceiverBody,
} from '@workspace/poco'
import {
  createReceiverSchema,
  searchReceiversSchema,
  updateReceiverSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { ReceiverService } from './receiver.service.js'

/**
 * The receiver routes. Everything here reads the tenant and the user from
 * the session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages receivers.
 */
@Controller('receivers')
export class ReceiversController {
  constructor(private readonly receivers: ReceiverService) {}

  /** Creates a receiver for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createReceiverSchema)) body: CreateReceiverBody
  ): Promise<Receiver> {
    return toWire(
      await this.receivers.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's receivers, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchReceiversSchema)) args: SearchReceiversArgs
  ): Promise<PagedResults<Receiver>> {
    const { rows, total } = await this.receivers.search(session.tenant.id, args)

    return { total, items: rows.map(toWire) }
  }

  /** Lists the tenant's ACTIVE receivers by name, for pickers. */
  @Get()
  async list(
    @CurrentSession() session: Session
  ): Promise<ReceiverRef[]> {
    return this.receivers.listActive(session.tenant.id)
  }

  /** Reads one receiver, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Receiver> {
    return toWire(await this.receivers.find(session.tenant.id, id))
  }

  /** Updates a receiver. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateReceiverSchema)) body: UpdateReceiverBody
  ): Promise<Receiver> {
    return toWire(
      await this.receivers.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Soft-deletes a receiver: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.receivers.softDelete(
      session.tenant.id,
      session.user.id,
      id
    )
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
function toWire(row: {
  id: number
  name: string
  type: ReceiverType
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Receiver {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
