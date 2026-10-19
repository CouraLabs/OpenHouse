import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Account, Currency, Goal } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { GoalRepository } from './goal.repository.js'
import { GoalService } from './goal.service.js'

/** A goal row the repository can hand back, with every field the service reads. */
const row = (overrides: Partial<Goal> = {}): Goal => ({
  id: 1,
  tenantId: 1,
  name: 'Emergency fund',
  linkedAccountId: 5,
  balance: '100.00',
  balanceDt: '2026-01-31',
  targetBalance: '1000.00',
  targetDt: '2026-12-31',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The account the account repository finds — an ACTIVE Savings account
 * unless overridden. */
const account = (overrides: Partial<Account> = {}): Account => ({
  id: 5,
  tenantId: 1,
  name: 'Rainy day',
  agency: '1234',
  number: '98765',
  type: 'Savings',
  balance: '100.00',
  currency: 'USD',
  spreadPct: '0.00',
  limit: null,
  closeDay: null,
  dueDay: null,
  closeDayInclusive: false,
  isDefault: false,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A goal repository mock with every method the service touches. */
const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
})

/** An account repository mock with every method the service touches. */
const accounts = () => ({
  findById: vi.fn(async (): Promise<Account | undefined> => account()),
})

/** A settings repository whose tenant runs on `mainCurrency`. */
const settingsIn = (mainCurrency: Currency) =>
  ({
    findByTenant: vi.fn(async () => ({
      tenantId: 1,
      timezone: 'UTC',
      mainCurrency,
      timezoneConfirmed: true,
      updateBy: null,
      updateDt: new Date('2026-01-01T00:00:00Z'),
    })),
  }) as unknown as SettingsRepository

const body = {
  name: 'Emergency fund',
  linkedAccountId: 5,
  balance: '100.00',
  balanceDt: '2026-01-31',
  targetBalance: '1000.00',
  targetDt: '2026-12-31',
} as const

describe('GoalService', () => {
  it('creates a goal when the linked account is a usable Savings account', async () => {
    const repo = repository()
    const bank = accounts()
    repo.insert.mockResolvedValue({ ...row(), accountName: 'Rainy day' })
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    const created = await service.create(1, 7, body)

    expect(created.accountName).toBe('Rainy day')
    // The goal stores no currency: the wire reads the main currency.
    expect(created.currency).toBe('USD')
    expect(repo.insert).toHaveBeenCalledWith(1, 7, body)
  })

  it('rejects an account outside the main currency with 409', async () => {
    const repo = repository()
    const bank = accounts()
    bank.findById.mockResolvedValue(account({ currency: 'USD' }))
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('BRL')
    )

    const attempt = service.create(1, 7, body)

    await expect(attempt).rejects.toThrow(ConflictException)
    await expect(attempt).rejects.toThrow(
      'This account is in USD; goals use your main currency (BRL).'
    )
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects a create whose account the tenant does not hold', async () => {
    const repo = repository()
    const bank = accounts()
    bank.findById.mockResolvedValue(undefined)
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    await expect(service.create(1, 7, body)).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects a create whose account is DELETED', async () => {
    const repo = repository()
    const bank = accounts()
    bank.findById.mockResolvedValue(account({ status: 'DELETED' }))
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    await expect(service.create(1, 7, body)).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects a create whose account is not a Savings account', async () => {
    const repo = repository()
    const bank = accounts()
    bank.findById.mockResolvedValue(account({ type: 'Checking' }))
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    await expect(service.create(1, 7, body)).rejects.toThrow(
      BadRequestException
    )
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('updates an ACTIVE goal', async () => {
    const repo = repository()
    const bank = accounts()
    repo.findById.mockResolvedValue({ ...row(), accountName: 'Rainy day' })
    repo.update.mockResolvedValue({
      ...row({ balance: '250.00' }),
      accountName: 'Rainy day',
    })
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    const updated = await service.update(1, 7, { ...body, id: 1 })

    expect(updated.balance).toBe('250.00')
    // Only the writable fields reach the repository: the id selects the row,
    // it is never part of the update — the column is GENERATED ALWAYS.
    expect(repo.update).toHaveBeenCalledWith(1, 1, 7, body)
  })

  it('rejects the update of a deleted goal as missing', async () => {
    const repo = repository()
    const bank = accounts()
    repo.findById.mockResolvedValue({
      ...row(),
      status: 'DELETED',
      accountName: 'Rainy day',
    })
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    await expect(service.update(1, 7, { ...body, id: 1 })).rejects.toThrow(
      NotFoundException
    )
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('rejects a read of a goal the tenant does not hold', async () => {
    const repo = repository()
    const bank = accounts()
    repo.findById.mockResolvedValue(undefined)
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundException)
  })

  it('soft-deletes a goal the tenant holds', async () => {
    const repo = repository()
    const bank = accounts()
    repo.findById.mockResolvedValue({ ...row(), accountName: 'Rainy day' })
    const service = new GoalService(
      repo as unknown as GoalRepository,
      bank as unknown as AccountRepository,
      settingsIn('USD')
    )

    await service.softDelete(1, 7, 1)

    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})
