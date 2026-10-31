import type {
  Account,
  AccountRepository,
  AccountWrite,
} from '@workspace/db'
import { SPREAD_WARNING_PCT } from '@workspace/domain'
import type {
  AccountDeleteConflict,
  AccountPreview,
  AccountPreviewBody,
  CardCycle,
  CreateAccountBody,
  SearchAccountsArgs,
  UpdateAccountBody,
} from '@workspace/dto'

import { compareMoney } from '../calc/money.js'
import { ConflictError, NotFoundError } from '../errors.js'
import type { CardCycleSync } from '../ports/card-cycle-sync.js'
import {
  cardCycleOf,
  cycleDaysDiffer,
  cycleGapWarning,
} from '../calc/credit-card-cycle.js'
import type { StatementBills } from '../credit-card-statements/statement-bills.js'

export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly cardCycle: CardCycleSync,
    private readonly bills: Pick<StatementBills, 'unpaidSummary'>
  ) {}

  preview(body: AccountPreviewBody): AccountPreview {
    const spread = Number(body.spreadPct)
    const spreadWarning = Number.isFinite(spread) && spread > SPREAD_WARNING_PCT
    const bothSet = body.closeDay != null && body.dueDay != null
    const differ = bothSet
      ? cycleDaysDiffer(body.closeDay as number, body.dueDay as number)
      : true
    const gap =
      bothSet && differ
        ? cycleGapWarning(body.closeDay as number, body.dueDay as number)
        : null

    return {
      spreadWarning,
      spreadWarningPct: SPREAD_WARNING_PCT,
      cycleDaysDiffer: differ,
      cycleGapWarning: gap,
    }
  }

  async create(tenantId: number, userId: number, body: CreateAccountBody) {
    assertCycleDaysDiffer(body)

    return this.repository.insert(tenantId, userId, toWrite(body))
  }

  async listActive(tenantId: number) {
    return this.repository.listActive(tenantId)
  }

  async search(tenantId: number, args: SearchAccountsArgs) {
    return this.repository.search(tenantId, args)
  }

  async find(tenantId: number, id: number) {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No account with id ${id}.`)
    }

    return row
  }

  async update(tenantId: number, userId: number, body: UpdateAccountBody) {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No account with id ${body.id}.`)
    }

    if (body.currency !== row.currency) {
      throw new ConflictError(
        'The currency cannot change: the money already recorded is denominated in it.'
      )
    }

    if (
      body.type !== row.type &&
      (await this.repository.hasTransactions(tenantId, body.id))
    ) {
      throw new ConflictError(
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
      throw new NotFoundError(`No account with id ${body.id}.`)
    }

    return updated
  }

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
      const owed = await this.bills.unpaidSummary(tenantId, id)

      if (owed.unpaidBills > 0 || compareMoney(owed.amountDue, '0') > 0) {
        const conflict: AccountDeleteConflict = {
          message: 'This card still owes on its bills.',
          ...owed,
        }

        throw new ConflictError(conflict)
      }
    }

    await this.repository.softDelete(tenantId, id, userId)
  }
}

function assertCycleDaysDiffer(body: CreateAccountBody): void {
  if (
    body.type === 'Credit Card' &&
    body.closeDay != null &&
    body.dueDay != null &&
    !cycleDaysDiffer(body.closeDay, body.dueDay)
  ) {
    throw new ConflictError('The close and due days must differ.')
  }
}

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

function toWrite(body: CreateAccountBody): AccountWrite {
  return {
    name: body.name,
    agency: body.agency ?? null,
    number: body.number ?? null,
    type: body.type,
    openingBalance: body.balance ?? '0.00',
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
