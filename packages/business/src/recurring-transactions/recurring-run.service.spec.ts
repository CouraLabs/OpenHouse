import { describe, expect, it, vi } from 'vitest'
import type {
  AccountRepository,
  CategoryRepository,
  ReceiverRepository,
  RecurringTransaction,
  RecurringTransactionRepository,
  SettingsRepository,
  TransactionRepository,
  TransactionRow,
  TransactionWrite,
} from '@workspace/db'

import { shiftDay } from '../calc/recurrence.js'
import type { Clock } from '../ports/clock.js'
import type { HouseholdMembers } from '../ports/household-members.js'
import { RecurringRunService } from './recurring-run.service.js'
import type { TransactionWrites } from '../transactions/transaction-writes.js'

const rule = (
  overrides: Partial<RecurringTransaction> = {}
): RecurringTransaction => ({
  id: 1,
  tenantId: 1,
  receiverId: 5,
  categoryId: 3,
  linkedAccountId: 10,
  amount: '99.90',
  type: 'Expense',
  frequency: 'Monthly',
  frequencyDay: 14,
  frequencyMonth: null,
  paidByUserId: null,
  defaultSplit: null,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const NOW = new Date('2026-10-15T12:00:00Z')

const fixedClock = (now: Date = NOW): Clock => ({ now: () => now })

const settingsIn = (timezone = 'UTC') => ({
  timezonesOf: vi.fn(
    async (ids: readonly number[]) =>
      new Map(ids.map((id) => [id, timezone] as const))
  ),
})

const household = {
  activeMemberIds: async () => [1, 2],
  ownerId: async () => 1,
}

describe('RecurringRunService.runForTenant', () => {
  const today = '2026-10-15'
  const dueRule = rule({
    frequency: 'Daily',
    frequencyDay: null,
    frequencyMonth: null,
  })

  const run = (
    rules: RecurringTransaction[],
    existing: boolean,
    timezone = 'UTC',
    now = NOW,
    members = household
  ) => {
    const rulesRepo = {
      listActiveRules: vi.fn(async () => rules),
      findById: vi.fn(async () => ({
        ...rules[0],
        receiverName: 'City Power',
        categoryName: 'Utilities',
        accountName: 'Everyday',
      })),
    }
    const transactionsRepo = {
      findByRecurringAndDate: vi.fn(async () =>
        existing ? ({ id: 99 } as const) : undefined
      ),
      insertGenerated: vi.fn(
        async (
          _tenantId: number,
          _write: TransactionWrite
        ): Promise<TransactionRow | undefined> => ({}) as TransactionRow
      ),
    }
    const accountsRepo = {
      findById: vi.fn(async () => ({ id: 10, status: 'ACTIVE' })),
    }
    const categoriesRepo = {
      findById: vi.fn(async () => ({ id: 3, status: 'ACTIVE' })),
    }
    const receiversRepo = {
      findById: vi.fn(async () => ({ id: 5, status: 'ACTIVE' })),
    }
    const svc = new RecurringRunService(
      rulesRepo as unknown as RecurringTransactionRepository,
      transactionsRepo as unknown as TransactionRepository,
      accountsRepo as unknown as AccountRepository,
      categoriesRepo as unknown as CategoryRepository,
      receiversRepo as unknown as ReceiverRepository,
      settingsIn(timezone) as unknown as SettingsRepository,
      fixedClock(now),
      members as unknown as HouseholdMembers,
      transactionsRepo as unknown as TransactionWrites
    )

    return {
      svc,
      rulesRepo,
      transactionsRepo,
      accountsRepo,
      categoriesRepo,
      receiversRepo,
    }
  }

  it('pays a rule whose payer was removed through the owner', async () => {
    const removed = rule({
      frequency: 'Daily',
      frequencyDay: null,
      frequencyMonth: null,
      paidByUserId: 7,
    })
    const { svc, transactionsRepo } = run(
      [removed],
      false,
      'UTC',
      NOW,
      household
    )

    await svc.runForTenant(1, 1)

    expect(transactionsRepo.insertGenerated).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ paidByUserId: 1 })
    )
  })

  it('materializes a due rule that has no transaction today', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(1)
    expect(transactionsRepo.insertGenerated).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        recurringId: 1,
        transactionDt: today,
        amount: '99.90',
        type: 'Expense',
        invoice: 'RECURRING',
        name: 'City Power',
      })
    )
  })

  it("copies the rule's payer and default shares onto the transaction", async () => {
    const shared = rule({
      frequency: 'Daily',
      frequencyDay: null,
      frequencyMonth: null,
      paidByUserId: 2,
      defaultSplit: {
        mode: 'percentage',
        entries: [
          { userId: 1, value: '60' },
          { userId: 2, value: '40' },
        ],
      },
    })
    const { svc, transactionsRepo } = run([shared], false)

    await svc.runForTenant(1, 1)

    expect(transactionsRepo.insertGenerated).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        paidByUserId: 2,
        splits: [
          { userId: 1, share: '59.94' },
          { userId: 2, share: '39.96' },
        ],
      })
    )
  })

  it('leaves a rule with no default split unsplit', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)

    await svc.runForTenant(1, 1)

    const [, write] = transactionsRepo.insertGenerated.mock.calls[0]

    expect(write.splits).toBeUndefined()
  })

  it("dates by the tenant's zone: 01:00 UTC is still yesterday at UTC−03:00", async () => {
    const { svc, transactionsRepo } = run(
      [dueRule],
      false,
      'America/Sao_Paulo',
      new Date('2026-10-15T01:00:00Z')
    )

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(1)
    expect(transactionsRepo.insertGenerated).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ transactionDt: '2026-10-14' })
    )
  })

  it("does not run a day-of-month rule before the tenant's day begins", async () => {
    const monthly15 = rule({ frequencyDay: 15 })
    const { svc, transactionsRepo } = run(
      [monthly15],
      false,
      'America/Sao_Paulo',
      new Date('2026-10-15T01:00:00Z')
    )

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('skips a rule whose transaction already exists today — idempotent', async () => {
    const { svc, transactionsRepo } = run([dueRule], true)

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('counts a lost insert race as materialized, not created', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)
    transactionsRepo.insertGenerated.mockResolvedValueOnce(undefined)

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(0)
  })

  it('catches up the missed days of an outage, oldest first, ending today', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)

    const created = await svc.runForTenant(1, 3)

    expect(created).toBe(3)
    const days = transactionsRepo.insertGenerated.mock.calls.map(
      ([, write]) => write.transactionDt
    )
    const expected = [shiftDay(today, -2), shiftDay(today, -1), today]

    expect(days).toEqual(expected)
  })

  it('does not generate before the day the rule was created', async () => {
    const fresh = rule({
      frequency: 'Daily',
      frequencyDay: null,
      frequencyMonth: null,
      createdDt: new Date(`${shiftDay(today, -1)}T12:00:00Z`),
    })
    const { svc, transactionsRepo } = run([fresh], false)

    const created = await svc.runForTenant(1, 3)

    expect(created).toBe(2)
    const days = transactionsRepo.insertGenerated.mock.calls.map(
      ([, write]) => write.transactionDt
    )

    expect(days).toEqual([shiftDay(today, -1), today])
  })

  it('skips a rule not due today', async () => {
    const notDue = rule({
      frequency: 'Yearly',
      frequencyDay: 25,
      frequencyMonth: 12,
    })
    const { svc, transactionsRepo } = run([notDue], false)

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('skips a rule whose account was deleted, without throwing', async () => {
    const { svc, transactionsRepo, accountsRepo } = run([dueRule], false)
    accountsRepo.findById.mockResolvedValue({ id: 10, status: 'DELETED' })

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('skips a rule whose category was deleted, without throwing', async () => {
    const { svc, transactionsRepo, categoriesRepo } = run([dueRule], false)
    categoriesRepo.findById.mockResolvedValue({ id: 3, status: 'DELETED' })

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('keeps going when one rule fails', async () => {
    const other = rule({
      id: 2,
      tenantId: 1,
      frequency: 'Daily',
      frequencyDay: null,
      frequencyMonth: null,
    })
    const rulesRepo = {
      listActiveRules: vi.fn(async () => [dueRule, other]),
      findById: vi.fn(async () => ({ ...dueRule, receiverName: 'X' })),
    }
    const transactionsRepo = {
      findByRecurringAndDate: vi.fn(async () => undefined),
      insertGenerated: vi
        .fn(
          async (
            _tenantId: number,
            _write: TransactionWrite
          ): Promise<TransactionRow | undefined> => ({}) as TransactionRow
        )
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue({} as TransactionRow),
    }
    const accountsRepo = {
      findById: vi.fn(async () => ({ id: 10, status: 'ACTIVE' })),
    }
    const categoriesRepo = {
      findById: vi.fn(async () => ({ id: 3, status: 'ACTIVE' })),
    }
    const receiversRepo = {
      findById: vi.fn(async () => ({ id: 5, status: 'ACTIVE' })),
    }
    const svc = new RecurringRunService(
      rulesRepo as unknown as RecurringTransactionRepository,
      transactionsRepo as unknown as TransactionRepository,
      accountsRepo as unknown as AccountRepository,
      categoriesRepo as unknown as CategoryRepository,
      receiversRepo as unknown as ReceiverRepository,
      settingsIn() as unknown as SettingsRepository,
      fixedClock(),
      household as unknown as HouseholdMembers,
      transactionsRepo as unknown as TransactionWrites
    )

    const created = await svc.runForTenant(1, 1)

    expect(created).toBe(1)
    expect(transactionsRepo.insertGenerated).toHaveBeenCalledTimes(2)
  })
})
