import type { Currency } from '@workspace/db'
import {
  periodWindow,
  todayIn,
  type CreateLimitBody,
  type SearchLimitsArgs,
  type UpdateLimitBody,
} from '@workspace/poco'

import { CategoryRepository } from '../categories/category.repository.js'
import { Clock } from '../common/clock/clock.js'
import { NotFoundError } from '../common/errors.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import {
  LimitRepository,
  type LimitRow,
  type LimitSearch,
} from './limit.repository.js'

/** A limit row denominated: the tenant's main currency, which every limit
 * is in, filled in for the wire. */
export type LimitView = LimitRow & { currency: Currency }

/** A limit with what its period has spent, and how many expenses in other
 * currencies were left out of that total. */
export type LimitUsageView = LimitView & {
  spent: string
  excludedCount: number
}

/**
 * The rules of limits: a limit must point at a category the tenant owns and
 * has not deleted, it is denominated in the tenant's main currency — limits
 * store no currency of their own — a deleted limit is a status change, and
 * the audit trail records the user the session acted as. The tenant and the
 * user always arrive from the caller — this service never reads a request.
 */
export class LimitService {
  constructor(
    private readonly repository: LimitRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  /** Creates a limit for the tenant, rejecting a category it cannot use. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateLimitBody
  ): Promise<LimitView> {
    await this.assertCategoryUsable(tenantId, body.categoryId)

    const [row, mainCurrency] = await Promise.all([
      this.repository.insert(tenantId, userId, body),
      this.mainCurrencyOf(tenantId),
    ])

    return { ...row, currency: mainCurrency }
  }

  /** Runs the tenant's paged search. */
  async search(
    tenantId: number,
    args: SearchLimitsArgs
  ): Promise<{ rows: LimitView[]; total: number }> {
    const [{ rows, total }, mainCurrency]: [LimitSearch, Currency] =
      await Promise.all([
        this.repository.search(tenantId, args),
        this.mainCurrencyOf(tenantId),
      ])

    return {
      rows: rows.map((row) => ({ ...row, currency: mainCurrency })),
      total,
    }
  }

  /**
   * Reads every ACTIVE limit with what the tenant has already spent against
   * it — the sum of the expense transactions in its category, from accounts
   * in the main currency, over the period the limit covers, on the tenant's
   * calendar day: its own day for a Daily limit, the Monday-based week, the
   * calendar month, the calendar year. Expenses from accounts in another
   * currency are not converted yet; they are counted in `excludedCount`
   * instead. One totals query per period type answers every limit of that
   * type.
   */
  async usage(tenantId: number): Promise<LimitUsageView[]> {
    const rows = await this.repository.listActive(tenantId)

    if (rows.length === 0) {
      return []
    }

    // The periods run on the tenant's calendar, not the server's.
    const settings = await this.settings.findByTenant(tenantId)
    if (settings === undefined) {
      throw new NotFoundError('Settings not found.')
    }
    const today = todayIn(settings.timezone, this.clock.now())

    // One window per period type the tenant actually limits with — never
    // more queries than the four periods.
    const windows = new Map(
      rows.map((row) => [row.type, periodWindow(row.type, today)])
    )

    // Keyed by `<period>:<categoryId>`: what the period spent in the main
    // currency, and how many expenses in other currencies it left out.
    const spent = new Map<string, string>()
    const excluded = new Map<string, number>()

    for (const [type, window] of windows) {
      const totals = await this.transactions.expenseTotalsByCategory(
        tenantId,
        window.from,
        window.to
      )

      for (const total of totals) {
        const key = `${type}:${total.categoryId}`

        if (total.currency === settings.mainCurrency) {
          spent.set(key, total.total)
        } else {
          excluded.set(key, (excluded.get(key) ?? 0) + total.count)
        }
      }
    }

    return rows.map((row) => ({
      ...row,
      currency: settings.mainCurrency,
      spent: spent.get(`${row.type}:${row.categoryId}`) ?? '0.00',
      excludedCount: excluded.get(`${row.type}:${row.categoryId}`) ?? 0,
    }))
  }

  /** Reads one limit — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<LimitView> {
    const [row, mainCurrency] = await Promise.all([
      this.repository.findById(tenantId, id),
      this.mainCurrencyOf(tenantId),
    ])

    if (row === undefined) {
      throw new NotFoundError(`No limit with id ${id}.`)
    }

    return { ...row, currency: mainCurrency }
  }

  /** Updates a limit, rejecting a category it cannot use. A deleted limit
   * updates like a missing one: it is gone for the UI. */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateLimitBody
  ): Promise<LimitView> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No limit with id ${body.id}.`)
    }

    await this.assertCategoryUsable(tenantId, body.categoryId)

    const updated = await this.repository.update(tenantId, body.id, userId, {
      categoryId: body.categoryId,
      amount: body.amount,
      type: body.type,
    })

    if (updated === undefined) {
      throw new NotFoundError(`No limit with id ${body.id}.`)
    }

    return { ...updated, currency: row.currency }
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

  /** The tenant's main currency — what every limit is denominated in. */
  private async mainCurrencyOf(tenantId: number): Promise<Currency> {
    const settings = await this.settings.findByTenant(tenantId)

    if (settings === undefined) {
      throw new NotFoundError('Settings not found.')
    }

    return settings.mainCurrency
  }

  /** Rejects a category that is missing or no longer ACTIVE. */
  private async assertCategoryUsable(
    tenantId: number,
    categoryId: number
  ): Promise<void> {
    const category = await this.categories.findById(tenantId, categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundError(`No category with id ${categoryId}.`)
    }
  }
}
