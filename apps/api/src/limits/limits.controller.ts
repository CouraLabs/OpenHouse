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
  CreateLimitBody,
  EntityStatus,
  Limit,
  LimitType,
  LimitUsage,
  Currency,
  PagedResults,
  SearchLimitsArgs,
  UpdateLimitBody,
} from '@workspace/poco'
import {
  createLimitSchema,
  searchLimitsSchema,
  updateLimitSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import type { LimitRow } from './limit.repository.js'
import { LimitService } from './limit.service.js'

/**
 * The limit routes. Everything here reads the tenant and the user from the
 * session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages limits.
 */
@Controller('limits')
export class LimitsController {
  constructor(private readonly limits: LimitService) {}

  /** Creates a limit for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createLimitSchema)) body: CreateLimitBody
  ): Promise<Limit> {
    return toWire(
      await this.limits.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's limits, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchLimitsSchema)) args: SearchLimitsArgs
  ): Promise<PagedResults<Limit>> {
    const { rows, total } = await this.limits.search(session.tenant.id, args)

    return { total, items: rows.map(toWire) }
  }

  /** Reads every ACTIVE limit with what the tenant has spent against it in
   * the period each limit covers — what the usage gauges render. */
  @Get('usage')
  async usage(@CurrentSession() session: Session): Promise<LimitUsage[]> {
    const rows = await this.limits.usage(session.tenant.id)

    return rows.map(toUsageWire)
  }

  /** Reads one limit, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Limit> {
    return toWire(await this.limits.find(session.tenant.id, id))
  }

  /** Updates a limit. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateLimitSchema)) body: UpdateLimitBody
  ): Promise<Limit> {
    return toWire(
      await this.limits.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Soft-deletes a limit: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.limits.softDelete(session.tenant.id, session.user.id, id)
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
function toWire(row: {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Limit {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amount: row.amount,
    type: row.type,
    currency: row.currency,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}

/** Maps a usage row onto the wire shape: the limit plus what it spent. */
function toUsageWire(row: LimitRow & { spent: string }): LimitUsage {
  return {
    ...toWire(row),
    spent: row.spent,
  }
}
