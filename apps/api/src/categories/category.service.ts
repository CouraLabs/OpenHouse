import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Category } from '@workspace/db'
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
@Injectable()
export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  /** Creates a category for the tenant, rejecting a name already ACTIVE. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateCategoryBody
  ): Promise<Category> {
    await this.assertNameFree(tenantId, body.name)

    try {
      return await this.repository.insert(tenantId, userId, body)
    } catch (error) {
      // The partial unique index is the backstop for a race the check above
      // can lose; the check is what makes the common case a friendly 409.
      if (isDuplicateActiveName(error)) {
        throw new ConflictException(
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
      throw new NotFoundException(`No category with id ${id}.`)
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
      throw new NotFoundException(`No category with id ${body.id}.`)
    }

    await this.assertNameFree(tenantId, body.name, body.id)

    try {
      const row = await this.repository.update(tenantId, body.id, userId, {
        name: body.name,
        color: body.color,
      })

      if (row === undefined) {
        throw new NotFoundException(`No category with id ${body.id}.`)
      }

      return row
    } catch (error) {
      if (isDuplicateActiveName(error)) {
        throw new ConflictException(
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
      throw new ConflictException(`A category named "${name}" already exists.`)
    }
  }
}

/** Whether the error is the partial unique index rejecting a duplicate name. */
function isDuplicateActiveName(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | undefined)?.cause

  return cause?.code === '23505'
}
