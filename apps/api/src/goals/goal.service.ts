import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  CreateGoalBody,
  SearchGoalsArgs,
  UpdateGoalBody,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import {
  GoalRepository,
  type GoalRow,
  type GoalSearch,
} from './goal.repository.js'

/**
 * The rules of goals: a goal must point at a Savings account the tenant owns
 * and has not deleted, a deleted goal is a status change, and the audit
 * trail records the user the session acted as. The tenant and the user
 * always arrive from the caller — this service never reads a request.
 */
@Injectable()
export class GoalService {
  constructor(
    private readonly repository: GoalRepository,
    private readonly accounts: AccountRepository
  ) {}

  /** Creates a goal for the tenant, rejecting an account it cannot use. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateGoalBody
  ): Promise<GoalRow> {
    await this.assertSavingsAccountUsable(
      tenantId,
      body.linkedAccountId,
      body.currency
    )

    return this.repository.insert(tenantId, userId, {
      ...body,
      targetDt: body.targetDt ?? null,
    })
  }

  /** Runs the tenant's paged search. */
  async search(tenantId: number, args: SearchGoalsArgs): Promise<GoalSearch> {
    return this.repository.search(tenantId, args)
  }

  /** Reads one goal — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<GoalRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No goal with id ${id}.`)
    }

    return row
  }

  /** Updates a goal, rejecting an account it cannot use. A deleted goal
   * updates like a missing one: it is gone for the UI. */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateGoalBody
  ): Promise<GoalRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No goal with id ${body.id}.`)
    }

    await this.assertSavingsAccountUsable(
      tenantId,
      body.linkedAccountId,
      body.currency
    )

    const updated = await this.repository.update(tenantId, body.id, userId, {
      name: body.name,
      linkedAccountId: body.linkedAccountId,
      balance: body.balance,
      balanceDt: body.balanceDt,
      targetBalance: body.targetBalance,
      targetDt: body.targetDt ?? null,
      currency: body.currency,
    })

    if (updated === undefined) {
      throw new NotFoundException(`No goal with id ${body.id}.`)
    }

    return updated
  }

  /** Soft-deletes a goal. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  /**
   * Rejects a linked account that is missing, no longer ACTIVE, or not a
   * Savings account — only Savings can back a goal — and a currency that
   * does not match the account's: the goal tracks a balance the account
   * already denominates, so comparing progress across currencies would
   * answer nonsense.
   */
  private async assertSavingsAccountUsable(
    tenantId: number,
    accountId: number,
    currency: string
  ): Promise<void> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${accountId}.`)
    }

    if (account.type !== 'Savings') {
      throw new BadRequestException('Only a Savings account can back a goal.')
    }

    if (account.currency !== currency) {
      throw new ConflictException(
        "The goal must be denominated in the account's currency."
      )
    }
  }
}
