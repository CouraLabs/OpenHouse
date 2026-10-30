import type { Currency } from '@workspace/db'
import type {
  CreateGoalBody,
  SearchGoalsArgs,
  UpdateGoalBody,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { BadRequestError, ConflictError, NotFoundError } from '../common/errors.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import {
  GoalRepository,
  type GoalRow,
  type GoalSearch,
} from './goal.repository.js'

export type GoalView = GoalRow & { currency: Currency }

export class GoalService {
  constructor(
    private readonly repository: GoalRepository,
    private readonly accounts: AccountRepository,
    private readonly settings: SettingsRepository
  ) {}

  async create(
    tenantId: number,
    userId: number,
    body: CreateGoalBody
  ): Promise<GoalView> {
    const mainCurrency = await this.mainCurrencyOf(tenantId)
    await this.assertSavingsAccountUsable(
      tenantId,
      body.linkedAccountId,
      mainCurrency
    )

    const row = await this.repository.insert(tenantId, userId, {
      ...body,
      targetDt: body.targetDt ?? null,
    })

    return { ...row, currency: mainCurrency }
  }

  async search(
    tenantId: number,
    args: SearchGoalsArgs
  ): Promise<{ rows: GoalView[]; total: number }> {
    const [{ rows, total }, mainCurrency]: [GoalSearch, Currency] =
      await Promise.all([
        this.repository.search(tenantId, args),
        this.mainCurrencyOf(tenantId),
      ])

    return {
      rows: rows.map((row) => ({ ...row, currency: mainCurrency })),
      total,
    }
  }

  async find(tenantId: number, id: number): Promise<GoalView> {
    const [row, mainCurrency] = await Promise.all([
      this.repository.findById(tenantId, id),
      this.mainCurrencyOf(tenantId),
    ])

    if (row === undefined) {
      throw new NotFoundError(`No goal with id ${id}.`)
    }

    return { ...row, currency: mainCurrency }
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateGoalBody
  ): Promise<GoalView> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No goal with id ${body.id}.`)
    }

    await this.assertSavingsAccountUsable(
      tenantId,
      body.linkedAccountId,
      row.currency
    )

    const updated = await this.repository.update(tenantId, body.id, userId, {
      name: body.name,
      linkedAccountId: body.linkedAccountId,
      balance: body.balance,
      balanceDt: body.balanceDt,
      targetBalance: body.targetBalance,
      targetDt: body.targetDt ?? null,
    })

    if (updated === undefined) {
      throw new NotFoundError(`No goal with id ${body.id}.`)
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

  private async assertSavingsAccountUsable(
    tenantId: number,
    accountId: number,
    mainCurrency: Currency
  ): Promise<void> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${accountId}.`)
    }

    if (account.type !== 'Savings') {
      throw new BadRequestError('Only a Savings account can back a goal.')
    }

    if (account.currency !== mainCurrency) {
      throw new ConflictError(
        `This account is in ${account.currency}; goals use your main currency (${mainCurrency}).`
      )
    }
  }
}
