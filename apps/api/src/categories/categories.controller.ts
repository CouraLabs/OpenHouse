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
  Category,
  CategoryRef,
  CreateCategoryBody,
  EntityStatus,
  PagedResults,
  SearchCategoriesArgs,
  UpdateCategoryBody,
} from '@workspace/poco'
import {
  createCategorySchema,
  searchCategoriesSchema,
  updateCategorySchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { CategoryService } from './category.service.js'

/**
 * The category routes. Everything here reads the tenant and the user from
 * the session, so a client can only ever see or act on its own tenant —
 * the request names no tenant anywhere. Every signed-in role manages
 * categories.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoryService) {}

  /** Creates a category for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryBody
  ): Promise<Category> {
    const row = await this.categories.create(
      session.tenant.id,
      session.user.id,
      body
    )

    return toWire(row)
  }

  /** Searches the tenant's categories, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchCategoriesSchema))
    args: SearchCategoriesArgs
  ): Promise<PagedResults<Category>> {
    const { rows, total } = await this.categories.search(
      session.tenant.id,
      args
    )

    return { total, items: rows.map(toWire) }
  }

  /** Lists the tenant's ACTIVE categories by name, for pickers. */
  @Get()
  async list(@CurrentSession() session: Session): Promise<CategoryRef[]> {
    const rows = await this.categories.listActive(session.tenant.id)

    return rows.map((row) => ({ id: row.id, name: row.name }))
  }

  /** Reads one category, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Category> {
    return toWire(await this.categories.find(session.tenant.id, id))
  }

  /** Updates a category. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryBody
  ): Promise<Category> {
    const row = await this.categories.update(
      session.tenant.id,
      session.user.id,
      body
    )

    return toWire(row)
  }

  /** Soft-deletes a category: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.categories.softDelete(session.tenant.id, session.user.id, id)
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
function toWire(row: {
  id: number
  name: string
  color: string
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
