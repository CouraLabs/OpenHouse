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
  CreateTransactionLinkerBody,
  EntityStatus,
  PagedResults,
  SearchTransactionLinkersArgs,
  TransactionLinker,
  UpdateTransactionLinkerBody,
} from '@workspace/poco'
import {
  createTransactionLinkerSchema,
  searchTransactionLinkersSchema,
  updateTransactionLinkerSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { TransactionLinkerService } from './transaction-linker.service.js'

/**
 * The transaction linker routes. Everything here reads the tenant and the
 * user from the session, so a client can only ever see or act on its own
 * tenant — the request names no tenant anywhere. Every signed-in role
 * manages linkers.
 */
@Controller('transaction-linkers')
export class TransactionLinkersController {
  constructor(private readonly linkers: TransactionLinkerService) {}

  /** Creates a linker for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createTransactionLinkerSchema))
    body: CreateTransactionLinkerBody
  ): Promise<TransactionLinker> {
    return toWire(
      await this.linkers.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's linkers, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchTransactionLinkersSchema))
    args: SearchTransactionLinkersArgs
  ): Promise<PagedResults<TransactionLinker>> {
    const { rows, total } = await this.linkers.search(session.tenant.id, args)

    return { total, items: rows.map(toWire) }
  }

  /** Reads one linker, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<TransactionLinker> {
    return toWire(await this.linkers.find(session.tenant.id, id))
  }

  /** Updates a linker. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateTransactionLinkerSchema))
    body: UpdateTransactionLinkerBody
  ): Promise<TransactionLinker> {
    return toWire(
      await this.linkers.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Soft-deletes a linker: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.linkers.softDelete(session.tenant.id, session.user.id, id)
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
function toWire(row: {
  id: number
  description: string
  categoryId: number
  categoryName: string
  receiverId: number | null
  receiverName: string | null
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): TransactionLinker {
  return {
    id: row.id,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
