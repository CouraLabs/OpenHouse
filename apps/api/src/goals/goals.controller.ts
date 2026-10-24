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
  StreamableFile,
} from '@nestjs/common'
import type {
  CreateGoalBody,
  Currency,
  EntityStatus,
  Goal,
  PagedResults,
  SearchGoalsArgs,
  UpdateGoalBody,
} from '@workspace/poco'
import {
  createGoalSchema,
  searchGoalsSchema,
  updateGoalSchema,
} from '@workspace/poco'
import type { ExportGoalsArgs } from '@workspace/poco'
import { exportGoalsSchema } from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { CsvExporter } from '../common/csv/csv-exporter.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import { GOAL_CSV_COLUMNS } from './goal-csv.js'

import { GoalService } from './goal.service.js'

/**
 * The goal routes. Everything here reads the tenant and the user from the
 * session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages goals.
 */
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goals: GoalService,
    private readonly csv: CsvExporter
  ) {}

  /** Creates a goal for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalBody
  ): Promise<Goal> {
    return toWire(
      await this.goals.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's goals, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchGoalsSchema)) args: SearchGoalsArgs
  ): Promise<PagedResults<Goal>> {
    const { rows, total } = await this.goals.search(session.tenant.id, args)

    return { total, items: rows.map(toWire) }
  }

  /** Streams the tenant's goals as a CSV: every row the
   * search matches, unpaged, written in the locale of the body. */
  @Post('export')
  @HttpCode(200)
  async exportCsv(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(exportGoalsSchema)) args: ExportGoalsArgs
  ): Promise<StreamableFile> {
    return this.csv.download({
      session,
      entity: 'goals',
      locale: args.locale,
      columns: GOAL_CSV_COLUMNS,
      read: async (skip, limit) => {
        const { rows } = await this.goals.search(session.tenant.id, {
          ...args,
          skip,
          limit,
        })

        return rows.map(toWire)
      },
    })
  }

  /** Reads one goal, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Goal> {
    return toWire(await this.goals.find(session.tenant.id, id))
  }

  /** Updates a goal. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateGoalSchema)) body: UpdateGoalBody
  ): Promise<Goal> {
    return toWire(
      await this.goals.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Soft-deletes a goal: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.goals.softDelete(session.tenant.id, session.user.id, id)
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. The
 * `date` columns carry no time or zone, so they cross as `YYYY-MM-DD`. */
function toWire(row: {
  id: number
  name: string
  linkedAccountId: number
  accountName: string
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
  currency: Currency
  accountCurrency: Currency
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Goal {
  return {
    id: row.id,
    name: row.name,
    linkedAccountId: row.linkedAccountId,
    accountName: row.accountName,
    balance: row.balance,
    balanceDt: row.balanceDt,
    targetBalance: row.targetBalance,
    targetDt: row.targetDt,
    currency: row.currency,
    accountCurrency: row.accountCurrency,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
