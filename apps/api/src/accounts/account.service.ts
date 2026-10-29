import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Account } from '@workspace/db'
import {
  cardCycleOf,
  compareMoney,
  cycleDaysDiffer,
  type AccountDeleteConflict,
  type CardCycle,
  type CreateAccountBody,
  type SearchAccountsArgs,
  type UpdateAccountBody,
} from '@workspace/poco'

import { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
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
  constructor(
    private readonly repository: AccountRepository,
    private readonly cardCycle: CardCycleSync,
    private readonly statements: CreditCardStatementRepository
  ) {}

  /** Creates an account for the tenant, mapping absent optionals to nulls. */
  async create(tenantId: number, userId: number, body: CreateAccountBody) {
    assertCycleDaysDiffer(body)

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
   * credit totals; a Checking account's never do) — and a card that has
   * bills always has transactions, so its type is frozen with them.
   *
   * A card whose close or due days change takes its Open bills along in
   * the same transaction (`CardCycleSync`); closed bills keep their days.
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

    assertCycleDaysDiffer(body)

    const write = toWrite(body)
    const cycle = changedCycle(row, write)

    const updated = await this.repository.update(
      tenantId,
      body.id,
      userId,
      write,
      cycle === null
        ? undefined
        : await this.cardCycle.onCycleChanged(tenantId, userId, body.id, cycle)
    )

    if (updated === undefined) {
      throw new NotFoundException(`No account with id ${body.id}.`)
    }

    return updated
  }

  /**
   * Soft-deletes an account. Deleting an already-deleted row is a no-op.
   * A card that still owes on its bills answers 409 with what it owes
   * until the caller confirms; its bills stay readable in history.
   */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number,
    confirmUnpaidBills = false
  ): Promise<void> {
    const row = await this.find(tenantId, id)

    if (
      row.type === 'Credit Card' &&
      row.status === 'ACTIVE' &&
      !confirmUnpaidBills
    ) {
      const owed = await this.statements.unpaidSummary(tenantId, id)

      if (owed.unpaidBills > 0 || compareMoney(owed.amountDue, '0') > 0) {
        const conflict: AccountDeleteConflict = {
          message: 'This card still owes on its bills.',
          ...owed,
        }

        throw new ConflictException(conflict)
      }
    }

    await this.repository.softDelete(tenantId, id, userId)
  }
}

/** Rejects a card whose bill would close and fall due on the same day. */
function assertCycleDaysDiffer(body: CreateAccountBody): void {
  if (
    body.type === 'Credit Card' &&
    body.closeDay != null &&
    body.dueDay != null &&
    !cycleDaysDiffer(body.closeDay, body.dueDay)
  ) {
    throw new ConflictException('The close and due days must differ.')
  }
}

/** The card's new cycle when a save changes it, or nothing. A card that
 * had no days yet counts as changed: setting them assigns its bills. */
function changedCycle(row: Account, write: AccountWrite): CardCycle | null {
  if (row.type !== 'Credit Card' || write.type !== 'Credit Card') {
    return null
  }

  const cycle = cardCycleOf(write)

  if (
    cycle === null ||
    (row.closeDay === cycle.closeDay &&
      row.dueDay === cycle.dueDay &&
      row.closeDayInclusive === cycle.closeDayInclusive)
  ) {
    return null
  }

  return cycle
}

/** Maps the wire body onto the write shape: absent optionals become nulls. */
function toWrite(body: CreateAccountBody): AccountWrite {
  return {
    name: body.name,
    agency: body.agency ?? null,
    number: body.number ?? null,
    type: body.type,
    openingBalance: body.balance,
    ...(body.openingDt === undefined ? {} : { openingDt: body.openingDt }),
    currency: body.currency,
    spreadPct: body.spreadPct,
    limit: body.limit ?? null,
    closeDay: body.closeDay ?? null,
    dueDay: body.dueDay ?? null,
    closeDayInclusive: body.closeDayInclusive,
    isDefault: body.isDefault,
    ownership: body.ownership,
  }
}
