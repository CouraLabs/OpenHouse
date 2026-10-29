import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common'
import bcrypt from 'bcrypt'
import { describe, expect, it, vi } from 'vitest'
import type { PasswordResetCode, User } from '@workspace/db'

import type { Clock } from '../common/clock/clock.js'
import { PasswordResetRepository } from './password-reset.repository.js'
import { PasswordResetService } from './password-reset.service.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'
import { hashResetCode } from './reset-code.js'

const NOW = new Date('2026-10-19T12:00:00Z')
const clock: Clock = { now: () => NOW }

/** A user row with every field the service reads. */
const user = (overrides: Partial<User> = {}): User => ({
  id: 9,
  tenantId: 1,
  email: 'bia@example.com',
  name: 'Bia',
  password: 'old-hash',
  role: 'user',
  refreshTokenHash: 'refresh-hash',
  isActive: true,
  anonymizedAt: null,
  startPage: '/',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
})

/** A stored code row for `code`, open unless overridden. */
const stored = (
  code: string,
  overrides: Partial<PasswordResetCode> = {}
): PasswordResetCode => ({
  id: 3,
  userId: 9,
  codeHash: hashResetCode(code),
  kind: 'owner_issued',
  issuedBy: 1,
  expiresAt: new Date(NOW.getTime() + 60_000),
  usedAt: null,
  noticeSeenAt: null,
  createdAt: NOW,
  ...overrides,
})

/** A repository mock. The redeem batch answers both rows, unless the test
 * overrides who lost. */
const repository = () => ({
  findUserInTenant: vi.fn(async (): Promise<User | undefined> => user()),
  findUserByEmail: vi.fn(async (): Promise<User | undefined> => user()),
  replaceCodes: vi.fn(
    async (_userId: number, _kind: string, _now: Date, _rows: unknown[]) => {}
  ),
  findByHash: vi.fn(
    async (): Promise<PasswordResetCode | undefined> => undefined
  ),
  redeem: vi.fn(
    async (
      _codeId: number,
      _userId: number,
      _passwordHash: string,
      _now: Date
    ): Promise<
      | { kind: 'claimed'; user: User }
      | { kind: 'codeTaken' }
      | { kind: 'userGone' }
    > => ({ kind: 'claimed', user: user() })
  ),
})

const serviceWith = (repo: ReturnType<typeof repository>) =>
  new PasswordResetService(
    repo as unknown as PasswordResetRepository,
    new ResetAttemptLimiter(clock),
    clock
  )

describe('PasswordResetService', () => {
  it('issues a member a 30-minute code, invalidating their older ones, storing only its hash', async () => {
    const repo = repository()

    const issued = await serviceWith(repo).issueForMember(1, 1, 9)

    expect(issued.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
    expect(issued.expiresAt).toEqual(new Date(NOW.getTime() + 30 * 60_000))
    expect(repo.replaceCodes).toHaveBeenCalledWith(
      9,
      'owner_issued',
      NOW,
      expect.any(Array)
    )
    const rows = repo.replaceCodes.mock.calls[0][3] as Array<object>
    expect(rows).toEqual([
      expect.objectContaining({
        userId: 9,
        kind: 'owner_issued',
        issuedBy: 1,
        codeHash: hashResetCode(issued.code),
      }),
    ])
    // The plaintext never reaches the write.
    expect(JSON.stringify(rows)).not.toContain(issued.code)
    expect(JSON.stringify(rows)).not.toContain(issued.code.replace('-', ''))
  })

  it('refuses a code for an owner, a removed user, or a stranger', async () => {
    const repo = repository()
    const service = serviceWith(repo)

    repo.findUserInTenant.mockResolvedValueOnce(user({ role: 'owner' }))
    await expect(service.issueForMember(1, 1, 9)).rejects.toThrow(
      ConflictException
    )

    repo.findUserInTenant.mockResolvedValueOnce(user({ isActive: false }))
    await expect(service.issueForMember(1, 1, 9)).rejects.toThrow(
      ConflictException
    )

    repo.findUserInTenant.mockResolvedValueOnce(undefined)
    await expect(service.issueForMember(1, 1, 9)).rejects.toThrow(
      NotFoundException
    )

    expect(repo.replaceCodes).not.toHaveBeenCalled()
  })

  it('generates 10 distinct recovery codes, replacing the previous set', async () => {
    const repo = repository()

    const codes = await serviceWith(repo).generateRecoveryCodes(1)

    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
    expect(repo.replaceCodes).toHaveBeenCalledWith(1, 'recovery', NOW, expect.any(Array))
    const rows = repo.replaceCodes.mock.calls[0][3] as Array<{
      kind: string
      expiresAt?: Date
    }>
    expect(rows).toHaveLength(10)
    expect(rows.every((row) => row.kind === 'recovery')).toBe(true)
    expect(rows.every((row) => row.expiresAt === undefined)).toBe(true)
  })

  it('redeems an open code: new password, sessions cleared, code used', async () => {
    const repo = repository()
    repo.findByHash.mockResolvedValue(stored('ABCDE-FGHJK'))

    const redeemed = await serviceWith(repo).redeem(
      'abcde fghjk',
      'password-new'
    )

    expect(redeemed.id).toBe(9)
    expect(repo.redeem).toHaveBeenCalledWith(3, 9, expect.any(String), NOW)
    const passwordHash = repo.redeem.mock.calls[0][2] as string
    expect(await bcrypt.compare('password-new', passwordHash)).toBe(true)
  })

  it('answers wrong, expired, and used codes with the same error', async () => {
    const cases: Array<PasswordResetCode | undefined> = [
      undefined,
      stored('ABCDE-FGHJK', { expiresAt: new Date(NOW.getTime() - 1) }),
      stored('ABCDE-FGHJK', { usedAt: NOW }),
    ]

    for (const found of cases) {
      const repo = repository()
      repo.findByHash.mockResolvedValue(found)

      await expect(
        serviceWith(repo).redeem('ABCDE-FGHJK', 'password-new')
      ).rejects.toThrow(new BadRequestException('This code is not valid.'))
      expect(repo.redeem).not.toHaveBeenCalled()
    }
  })

  it('refuses a code that loses the race or names a removed user', async () => {
    const repo = repository()
    repo.findByHash.mockResolvedValue(stored('ABCDE-FGHJK'))
    repo.redeem.mockResolvedValueOnce({ kind: 'codeTaken' })
    const service = serviceWith(repo)

    await expect(service.redeem('ABCDE-FGHJK', 'password-new')).rejects.toThrow(
      'This code is not valid.'
    )

    repo.redeem.mockResolvedValueOnce({ kind: 'userGone' })
    await expect(service.redeem('ABCDE-FGHJK', 'password-new')).rejects.toThrow(
      'This code is not valid.'
    )
  })

  it('blocks a prefix that failed 10 times with 429', async () => {
    const repo = repository()
    const service = serviceWith(repo)

    for (let failure = 0; failure < 10; failure += 1) {
      await expect(
        service.redeem('ABCDE-FGHJ2', 'password-new')
      ).rejects.toThrow(BadRequestException)
    }

    await expect(service.redeem('ABCDE-FGHJ3', 'password-new')).rejects.toThrow(
      HttpException
    )
    await expect(
      service.redeem('ABCDE-FGHJ3', 'password-new')
    ).rejects.not.toThrow(BadRequestException)
  })
})
