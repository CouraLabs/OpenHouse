import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  CreateAccountBody,
  SearchAccountsArgs,
  UpdateAccountBody,
} from '@workspace/poco'

import { AccountRepository, type AccountWrite } from './account.repository.js'

/**
 * The rules of accounts: a deleted account is a status change, the audit
 * trail records the user the session acted as, and at most one account of
 * the tenant carries the default flag — the repository moves it, never
 * duplicates it. The tenant and the user always arrive from the caller —
 * this service never reads a request.
 */
@Injectable()
export class AccountService {
  constructor(private readonly repository: AccountRepository) {}

  /** Creates an account for the tenant, mapping absent optionals to nulls. */
  async create(tenantId: number, userId: number, body: CreateAccountBody) {
    return this.repository.insert(tenantId, userId, toWrite(body))
  }

  /** Lists the tenant's ACTIVE accounts by name, for pickers. */
  async listActive(tenantId: number) {
    return this.repository.listActive(tenantId)
  }

  /** Runs the tenant's paged search. */
  async search(tenantId: number, args: SearchAccountsArgs) {
    return this.repository.search(tenantId, args)
  }

  /** Reads one account — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number) {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No account with id ${id}.`)
    }

    return row
  }

  /**
   * Updates an account. A deleted account updates like a missing one: it
   * is gone for the UI.
   *
   * Two fields are frozen once money moves through the account: the
   * currency — every transaction, balance, limit, and transfer already
   * recorded is denominated in it, and re-labeling them would falsify
   * every total — and the type, once transactions exist, because the type
   * decides how spending counts (a Credit Card's expenses land in the
   * credit totals; a Checking account's never do).
   */
  async update(tenantId: number, userId: number, body: UpdateAccountBody) {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${body.id}.`)
    }

    if (body.currency !== row.currency) {
      throw new ConflictException(
        'The currency cannot change: the money already recorded is denominated in it.'
      )
    }

    if (
      body.type !== row.type &&
      (await this.repository.hasTransactions(tenantId, body.id))
    ) {
      throw new ConflictException(
        'The type cannot change: the account already has transactions.'
      )
    }

    const updated = await this.repository.update(
      tenantId,
      body.id,
      userId,
      toWrite(body)
    )

    if (updated === undefined) {
      throw new NotFoundException(`No account with id ${body.id}.`)
    }

    return updated
  }

  /** Soft-deletes an account. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }
}

/** Maps the wire body onto the write shape: absent optionals become nulls. */
function toWrite(body: CreateAccountBody): AccountWrite {
  return {
    name: body.name,
    agency: body.agency ?? null,
    number: body.number ?? null,
    type: body.type,
    balance: body.balance,
    currency: body.currency,
    limit: body.limit ?? null,
    closeDay: body.closeDay ?? null,
    dueDay: body.dueDay ?? null,
    isDefault: body.isDefault,
  }
}
