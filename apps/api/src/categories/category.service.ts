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

/**
 * The rules of categories: a name is unique per tenant among ACTIVE rows,
 * a deleted category is a status change, and the audit trail records the
 * user the session acted as. The tenant and the user always arrive from the
 * caller — this service never reads a request.
 */
export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly members: HouseholdMembers
  ) {}

  /** Creates a category for the tenant, rejecting a name already ACTIVE. */
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
      // The partial unique index is the backstop for a race the check above
      // can lose; the check is what makes the common case a friendly 409.
      if (isUniqueViolation(error, 'categories', ['name_active'])) {
        throw new ConflictError(
          `A category named "${body.name}" already exists.`
        )
      }

      throw error
    }
  }

  /** Runs the tenant's paged search. */
  async search(
    tenantId: number,
    args: SearchCategoriesArgs
  ): Promise<CategorySearch> {
    return this.repository.search(tenantId, args)
  }

  /** Lists the tenant's ACTIVE categories by name, for pickers. */
  async listActive(tenantId: number): Promise<Category[]> {
    return this.repository.listActive(tenantId)
  }

  /** Reads one category — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<Category> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No category with id ${id}.`)
    }

    return row
  }

  /** Updates a category, rejecting a name another ACTIVE row already holds.
   * A deleted category updates like a missing one: it is gone for the UI. */
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

  /** Soft-deletes a category. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  /** A default split names active members only. */
  private async assertSplitMembers(
    tenantId: number,
    split: CreateCategoryBody['defaultSplit']
  ): Promise<void> {
    if (split != null) {
      assertMembers(await this.members.activeMemberIds(tenantId), null, split)
    }
  }

  /** Rejects a name an ACTIVE category of the tenant already holds. */
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

/** The columns a category body writes; the default split only when the
 * body states it (`null` clears it). */
function writeOf(body: CreateCategoryBody) {
  return {
    name: body.name,
    color: body.color,
    ...(body.defaultSplit === undefined
      ? {}
      : { defaultSplit: body.defaultSplit }),
  }
}
