import { describe, expect, it, vi } from 'vitest'
import type { RecurringTransaction } from '@workspace/db'

import type { AccountRepository } from '../accounts/account.repository.js'
import type { CategoryRepository } from '../categories/category.repository.js'
import type { Clock } from '../common/clock/clock.js'
import type { ReceiverRepository } from '../receivers/receiver.repository.js'
import type { SettingsRepository } from '../settings/settings.repository.js'
import type {
  TransactionRepository,
  TransactionRow,
  TransactionWrite,
} from '../transactions/transaction.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'
import {
  isDueOn,
  RecurringRunService,
  shiftDay,
} from './recurring-run.service.js'

describe('isDueOn', () => {
  it('is due every day', () => {
    expect(
      isDueOn(
        { frequency: 'Daily', frequencyDay: null, frequencyMonth: null },
        '2026-10-14'
      )
    ).toBe(true)
    expect(
      isDueOn(
        { frequency: 'Daily', frequencyDay: null, frequencyMonth: null },
        '2027-02-28'
      )
    ).toBe(true)
  })

  it('matches the ISO weekday, Monday first', () => {
    const weekly = (day: number) => ({
      frequency: 'Weekly' as const,
      frequencyDay: day,
      frequencyMonth: null,
    })

    // 2026-10-14 is a Wednesday (ISO weekday 3).
    expect(isDueOn(weekly(3), '2026-10-14')).toBe(true)
    expect(isDueOn(weekly(1), '2026-10-14')).toBe(false)
    expect(isDueOn(weekly(7), '2026-10-18')).toBe(true)
  })

  it('matches the day of the month', () => {
    const monthly = {
      frequency: 'Monthly' as const,
      frequencyDay: 14,
      frequencyMonth: null,
    }

    expect(isDueOn(monthly, '2026-10-14')).toBe(true)
    expect(isDueOn(monthly, '2026-10-15')).toBe(false)
  })

  it("clamps a day past the month's end to the last day", () => {
    const monthly = {
      frequency: 'Monthly' as const,
      frequencyDay: 31,
      frequencyMonth: null,
    }

    // September has 30 days: the rule runs on the 30th.
    expect(isDueOn(monthly, '2026-09-30')).toBe(true)
    expect(isDueOn(monthly, '2026-09-29')).toBe(false)
    // October has 31: it runs on the 31st.
    expect(isDueOn(monthly, '2026-10-31')).toBe(true)
  })

  it('clamps February 29 to February 28 of a common year', () => {
    const yearly = {
      frequency: 'Yearly' as const,
      frequencyDay: 29,
      frequencyMonth: 2,
    }

    expect(isDueOn(yearly, '2028-02-29')).toBe(true)
    expect(isDueOn(yearly, '2027-02-28')).toBe(true)
    expect(isDueOn(yearly, '2027-02-27')).toBe(false)
  })

  it('matches the month and the day for a yearly rule', () => {
    const yearly = {
      frequency: 'Yearly' as const,
      frequencyDay: 25,
      frequencyMonth: 12,
    }

    expect(isDueOn(yearly, '2026-12-25')).toBe(true)
    expect(isDueOn(yearly, '2027-12-25')).toBe(true)
    expect(isDueOn(yearly, '2026-11-25')).toBe(false)
  })
})

describe('shiftDay', () => {
  it('shifts across month and year boundaries without losing a day', () => {
    expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30')
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31')
    expect(shiftDay('2026-02-28', 1)).toBe('2026-03-01')
  })
})

/** A rule the cron can read, ACTIVE by default. */
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
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The instant every run below happens at: midday UTC on 2026-10-15. */
const NOW = new Date('2026-10-15T12:00:00Z')

/** A clock pinned to an instant. */
const fixedClock = (now: Date = NOW): Clock => ({ now: () => now })

/** A settings repository answering one zone for every tenant asked. */
const settingsIn = (timezone = 'UTC') => ({
  timezonesOf: vi.fn(
    async (ids: readonly number[]) =>
      new Map(ids.map((id) => [id, timezone] as const))
  ),
})

describe('RecurringRunService.runDue', () => {
  const today = '2026-10-15'
  const dueRule = rule({
    frequency: 'Daily',
    frequencyDay: null,
    frequencyMonth: null,
  })

  /** A run service over mocked repositories, with the references ACTIVE
   * and the names joined read. */
  const run = (
    rules: RecurringTransaction[],
    existing: boolean,
    timezone = 'UTC',
    now = NOW
  ) => {
    const rulesRepo = {
      listActiveAllTenants: vi.fn(async () => rules),
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
      fixedClock(now)
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

  it('materializes a due rule that has no transaction today', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)

    const created = await svc.runDue(1)

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

  it("dates by the tenant's zone: 01:00 UTC is still yesterday at UTC−03:00", async () => {
    const { svc, transactionsRepo } = run(
      [dueRule],
      false,
      'America/Sao_Paulo',
      new Date('2026-10-15T01:00:00Z')
    )

    const created = await svc.runDue(1)

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

    const created = await svc.runDue(1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('skips a rule whose transaction already exists today — idempotent', async () => {
    const { svc, transactionsRepo } = run([dueRule], true)

    const created = await svc.runDue(1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('counts a lost insert race as materialized, not created', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)
    transactionsRepo.insertGenerated.mockResolvedValueOnce(undefined)

    const created = await svc.runDue(1)

    expect(created).toBe(0)
  })

  it('catches up the missed days of an outage, oldest first, ending today', async () => {
    const { svc, transactionsRepo } = run([dueRule], false)

    const created = await svc.runDue(3)

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

    const created = await svc.runDue(3)

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

    const created = await svc.runDue(1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('skips a rule whose account was deleted, without throwing', async () => {
    const { svc, transactionsRepo, accountsRepo } = run([dueRule], false)
    accountsRepo.findById.mockResolvedValue({ id: 10, status: 'DELETED' })

    const created = await svc.runDue(1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('skips a rule whose category was deleted, without throwing', async () => {
    const { svc, transactionsRepo, categoriesRepo } = run([dueRule], false)
    categoriesRepo.findById.mockResolvedValue({ id: 3, status: 'DELETED' })

    const created = await svc.runDue(1)

    expect(created).toBe(0)
    expect(transactionsRepo.insertGenerated).not.toHaveBeenCalled()
  })

  it('keeps going when one rule fails', async () => {
    // Both rules are Daily, so this passes on any calendar day.
    const other = rule({
      id: 2,
      tenantId: 2,
      frequency: 'Daily',
      frequencyDay: null,
      frequencyMonth: null,
    })
    const rulesRepo = {
      listActiveAllTenants: vi.fn(async () => [dueRule, other]),
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
      fixedClock()
    )

    const created = await svc.runDue(1)

    expect(created).toBe(1)
    expect(transactionsRepo.insertGenerated).toHaveBeenCalledTimes(2)
  })
})
