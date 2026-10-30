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

export type LimitView = LimitRow & { currency: Currency }

export type LimitUsageView = LimitView & {
  spent: string
  excludedCount: number
}

export class LimitService {
  constructor(
    private readonly repository: LimitRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

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

  async usage(tenantId: number): Promise<LimitUsageView[]> {
    const rows = await this.repository.listActive(tenantId)

    if (rows.length === 0) {
      return []
    }

    const settings = await this.settings.findByTenant(tenantId)
    if (settings === undefined) {
      throw new NotFoundError('Settings not found.')
    }
    const today = todayIn(settings.timezone, this.clock.now())

    const windows = new Map(
      rows.map((row) => [row.type, periodWindow(row.type, today)])
    )

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

  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  private async mainCurrencyOf(tenantId: number): Promise<Currency> {
    const settings = await this.settings.findByTenant(tenantId)

    if (settings === undefined) {
      throw new NotFoundError('Settings not found.')
    }

    return settings.mainCurrency
  }

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
