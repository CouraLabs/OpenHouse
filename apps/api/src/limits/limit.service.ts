import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  CreateLimitBody,
  SearchLimitsArgs,
  UpdateLimitBody,
} from '@workspace/poco'

import { CategoryRepository } from '../categories/category.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import {
  LimitRepository,
  type LimitRow,
  type LimitSearch,
} from './limit.repository.js'
import { periodWindow } from './limit-period.js'

/**
 * The rules of limits: a limit must point at a category the tenant owns and
 * has not deleted, a deleted limit is a status change, and the audit trail
 * records the user the session acted as. The tenant and the user always
 * arrive from the caller — this service never reads a request.
 */
@Injectable()
export class LimitService {
  constructor(
    private readonly repository: LimitRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository
  ) {}

  /** Creates a limit for the tenant, rejecting a category it cannot use. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateLimitBody
  ): Promise<LimitRow> {
    await this.assertCategoryUsable(tenantId, body.categoryId)

    return this.repository.insert(tenantId, userId, body)
  }

  /** Runs the tenant's paged search. */
  async search(tenantId: number, args: SearchLimitsArgs): Promise<LimitSearch> {
    return this.repository.search(tenantId, args)
  }

  /**
   * Reads every ACTIVE limit with what the tenant has already spent against
   * it — the sum of the expense transactions its category and currency
   * share over the period the limit covers: its own day for a Daily limit,
   * the Monday-based week, the calendar month, the calendar year. One
   * totals query per period type answers every limit of that type.
   */
  async usage(tenantId: number): Promise<Array<LimitRow & { spent: string }>> {
    const rows = await this.repository.listActive(tenantId)

    if (rows.length === 0) {
      return []
    }

    // One window per period type the tenant actually limits with — never
    // more queries than the four periods.
    const windows = new Map(
      rows.map((row) => [row.type, periodWindow(row.type, new Date())])
    )

    const spent = new Map<string, string>()

    for (const [, window] of windows) {
      const totals = await this.transactions.expenseTotalsByCategory(
        tenantId,
        window.from,
        window.to
      )

      for (const total of totals) {
        spent.set(`${total.categoryId}:${total.currency}`, total.total)
      }
    }

    return rows.map((row) => ({
      ...row,
      spent: spent.get(`${row.categoryId}:${row.currency}`) ?? '0.00',
    }))
  }

  /** Reads one limit — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<LimitRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No limit with id ${id}.`)
    }

    return row
  }

  /** Updates a limit, rejecting a category it cannot use. A deleted limit
   * updates like a missing one: it is gone for the UI. */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateLimitBody
  ): Promise<LimitRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No limit with id ${body.id}.`)
    }

    await this.assertCategoryUsable(tenantId, body.categoryId)

    const updated = await this.repository.update(tenantId, body.id, userId, {
      categoryId: body.categoryId,
      amount: body.amount,
      type: body.type,
      currency: body.currency,
    })

    if (updated === undefined) {
      throw new NotFoundException(`No limit with id ${body.id}.`)
    }

    return updated
  }

  /** Soft-deletes a limit. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  /** Rejects a category that is missing or no longer ACTIVE. */
  private async assertCategoryUsable(
    tenantId: number,
    categoryId: number
  ): Promise<void> {
    const category = await this.categories.findById(tenantId, categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundException(`No category with id ${categoryId}.`)
    }
  }
}
