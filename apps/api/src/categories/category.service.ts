import type { Category } from '@workspace/db'
import { ConflictError, NotFoundError } from '../common/errors.js'
import {
  HouseholdMembers,
} from '../common/household/household-members.js'
import { isUniqueViolation } from '../common/db-errors.js'
import { assertMembers } from '../common/household/split-members.js'
import type {
  CreateCategoryBody,
  SearchCategoriesArgs,
  UpdateCategoryBody,
} from '@workspace/poco'

import {
  CategoryRepository,
  type CategorySearch,
} from './category.repository.js'

export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly members: HouseholdMembers
  ) {}

  async create(
    tenantId: number,
    userId: number,
    body: CreateCategoryBody
  ): Promise<Category> {
    await this.assertNameFree(tenantId, body.name)
    await this.assertSplitMembers(tenantId, body.defaultSplit)

    try {
      return await this.repository.insert(tenantId, userId, writeOf(body))
    } catch (error) {
      if (isUniqueViolation(error, 'categories', ['name_active'])) {
        throw new ConflictError(
          `A category named "${body.name}" already exists.`
        )
      }

      throw error
    }
  }

  async search(
    tenantId: number,
    args: SearchCategoriesArgs
  ): Promise<CategorySearch> {
    return this.repository.search(tenantId, args)
  }

  async listActive(tenantId: number): Promise<Category[]> {
    return this.repository.listActive(tenantId)
  }

  async find(tenantId: number, id: number): Promise<Category> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No category with id ${id}.`)
    }

    return row
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateCategoryBody
  ): Promise<Category> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No category with id ${body.id}.`)
    }

    await this.assertNameFree(tenantId, body.name, body.id)
    await this.assertSplitMembers(tenantId, body.defaultSplit)

    try {
      const row = await this.repository.update(
        tenantId,
        body.id,
        userId,
        writeOf(body)
      )

      if (row === undefined) {
        throw new NotFoundError(`No category with id ${body.id}.`)
      }

      return row
    } catch (error) {
      if (isUniqueViolation(error, 'categories', ['name_active'])) {
        throw new ConflictError(
          `A category named "${body.name}" already exists.`
        )
      }

      throw error
    }
  }

  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  private async assertSplitMembers(
    tenantId: number,
    split: CreateCategoryBody['defaultSplit']
  ): Promise<void> {
    if (split != null) {
      assertMembers(await this.members.activeMemberIds(tenantId), null, split)
    }
  }

  private async assertNameFree(
    tenantId: number,
    name: string,
    exceptId?: number
  ): Promise<void> {
    const taken = await this.repository.countActiveByName(
      tenantId,
      name,
      exceptId
    )

    if (taken > 0) {
      throw new ConflictError(`A category named "${name}" already exists.`)
    }
  }
}

function writeOf(body: CreateCategoryBody) {
  return {
    name: body.name,
    color: body.color,
    ...(body.defaultSplit === undefined
      ? {}
      : { defaultSplit: body.defaultSplit }),
  }
}
