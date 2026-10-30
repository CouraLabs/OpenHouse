import bcrypt from 'bcryptjs'
import { and, eq, isNull, sql } from 'drizzle-orm'

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../common/errors.js'
import type {
  Currency,
  Database,
  Tenant,
  TenantCode,
  TenantSettingsRow,
  User,
  UserRole,
} from '@workspace/db'
import { tenants, tenantCodes, tenantSettings, users } from '@workspace/db'
import {
  EMAIL_UNVERIFIED,
  tierPlan,
  toStartPage,
  type TierLevel,
  type EmailUnverifiedError,
  type SessionResponse,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import type { TierGate } from '../common/tiers/tier-gate.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import type { JwtTtls } from '../config/env.js'
import { hashToken, TokenService } from './token.service.js'
import { UserSessionRepository } from './user-session.repository.js'

let noUserHash: string | undefined

function noUserHashOf(): string {
  noUserHash ??= bcrypt.hashSync('no-user-has-this-password', 10)

  return noUserHash
}

export interface PublicUser {
  id: number
  tenantId: number
  email: string
  name: string
  role: UserRole
  startPage: string
  createdAt: Date
  updatedAt: Date
}

export interface PublicTenant {
  id: number
  name: string
  expiresIn: Date | null
  deletionDate: string | null
  createdAt: Date
  updatedAt: Date
}

export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly tokens: TokenService,
    private readonly settings: SettingsRepository,
    private readonly ttls: JwtTtls,
    private readonly requireVerifiedEmail: boolean,
    private readonly newTenantTier: TierLevel,
    private readonly tiers: TierGate,
    private readonly userSessions: UserSessionRepository
  ) {}

  async signUpWithTenant(body: {
    tenantName: string
    name: string
    email: string
    password: string
    timezone?: string
    currency?: Currency
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(body.password, 10)

    const tenantName = body.tenantName
    const tenantIdByName = sql`(select id from tenants where name = ${tenantName})`
    const stamp = new Date()

    let tenant: Tenant | undefined
    let user: User | undefined
    let settings: TenantSettingsRow | undefined

    try {
      const results = await runBatch(this.db, [
        this.db
          .insert(tenants)
          .values({ name: tenantName, tier: this.newTenantTier })
          .returning(),
        this.db
          .insert(users)
          .values({
            tenantId: tenantIdByName,
            email: normalizeEmail(body.email),
            name: body.name,
            password: passwordHash,
            role: 'owner',
            createdAt: stamp,
            updatedAt: stamp,
          })
          .returning(),
        this.db
          .insert(tenantSettings)
          .values({
            tenantId: tenantIdByName,
            timezone: body.timezone ?? 'UTC',
            mainCurrency: body.currency ?? 'USD',
            timezoneConfirmed: body.timezone !== undefined,
          })
          .returning(),
      ])

      const [tenants_, users_, settings_] = results as [
        Tenant[],
        User[],
        TenantSettingsRow[],
      ]

      tenant = tenants_[0]
      user = users_[0]
      settings = settings_[0]
    } catch (error) {
      throw this.conflictFor(error)
    }

    if (tenant === undefined || user === undefined || settings === undefined) {
      throw new Error('The sign-up batch did not complete.')
    }

    return user
  }

  async signUpWithCode(body: {
    tenantCode: string
    name: string
    email: string
    password: string
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(body.password, 10)

    const now = new Date()
    const [code] = await this.db.query.tenantCodes.findMany({
      where: { code: body.tenantCode },
      limit: 1,
    })
    if (code === undefined) {
      throw new UnauthorizedError('Unknown tenant code.')
    }
    if (code.usedAt !== null) {
      throw new ConflictError('This tenant code was already used.')
    }
    if (code.expiresAt !== null && code.expiresAt < now) {
      throw new ConflictError('This tenant code has expired.')
    }

    await this.tiers.assertCanAddUser(code.tenantId)

    const stamp = new Date()

    let user: User | undefined

    try {
      const [claimed, inserted] = (await runBatch(this.db, [
        this.db
          .update(tenantCodes)
          .set({ usedAt: now })
          .where(and(eq(tenantCodes.id, code.id), isNull(tenantCodes.usedAt)))
          .returning(),
        this.db
          .insert(users)
          .values({
            tenantId: code.tenantId,
            email: normalizeEmail(body.email),
            name: body.name,
            password: passwordHash,
            role: 'user',
            createdAt: stamp,
            updatedAt: stamp,
          })
          .returning(),
      ])) as [TenantCode[], User[]]

      if (claimed.length === 0) {
        throw new ConflictError('This tenant code was already used.')
      }

      user = inserted[0]
    } catch (error) {
      throw this.conflictFor(error)
    }

    if (user === undefined) {
      throw new Error('The sign-up batch did not complete.')
    }

    return user
  }

  async signIn(body: {
    email: string
    password: string
  }): Promise<SessionResponse> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, normalizeEmail(body.email)))

    const passwordMatches = await bcrypt.compare(
      body.password,
      user?.password ?? noUserHashOf()
    )
    if (!passwordMatches || user === undefined || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password.')
    }

    if (this.requireVerifiedEmail && user.emailVerifiedAt === null) {
      throw new ForbiddenError({
        message: 'Confirm your email before signing in.',
        error: 'Forbidden',
        statusCode: 403,
        code: EMAIL_UNVERIFIED,
      } satisfies EmailUnverifiedError)
    }

    return this.sessionFor(user)
  }

  async refresh(
    userId: number,
    presentedToken: string
  ): Promise<SessionResponse> {
    const [user] = await this.db.query.users.findMany({
      where: { id: userId },
      limit: 1,
    })
    if (user === undefined || !user.isActive) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    const presentedHash = await hashToken(presentedToken)
    const known =
      (await this.userSessions.find(userId, presentedHash, new Date())) !==
        undefined || user.refreshTokenHash === presentedHash

    if (!known) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    return this.sessionFor(user)
  }

  async current(session: Session): Promise<SessionResponse> {
    const settings = await this.settings.findByTenant(session.tenant.id)

    return this.sessionResponse(session.user, session.tenant, settings)
  }

  async changePassword(
    userId: number,
    body: { currentPassword: string; newPassword: string }
  ): Promise<SessionResponse> {
    const [user] = await this.db.query.users.findMany({
      where: { id: userId },
      limit: 1,
    })
    if (user === undefined || !user.isActive) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      throw new BadRequestError('Current password is incorrect.')
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10)
    const [updated] = await this.db
      .update(users)
      .set({
        password: passwordHash,
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()

    await this.userSessions.closeAll(userId)

    return this.sessionFor(updated)
  }

  async signOut(
    userId: number,
    presentedToken: string | undefined
  ): Promise<void> {
    if (presentedToken === undefined || presentedToken === '') {
      return
    }

    const presentedHash = await hashToken(presentedToken)

    await this.userSessions.close(userId, presentedHash)
    await this.userSessions.claimLegacy(userId, presentedHash)
  }

  async establishSession(
    session: SessionResponse,
    rememberMe: boolean,
    previousToken?: string
  ): Promise<{
    accessToken: string
    refreshToken: string
    accessMaxAgeS: number
    refreshMaxAgeS: number
  }> {
    const userId = session.user.id
    const accessToken = await this.tokens.signAccessToken(userId)
    const { token: refreshToken } = await this.tokens.signRefreshToken(
      userId,
      rememberMe
    )
    const refreshMaxAgeS = rememberMe
      ? this.ttls.rememberRefreshTtlS
      : this.ttls.refreshTtlS
    const now = new Date()
    const expiresAt = new Date(now.getTime() + refreshMaxAgeS * 1000)
    const tokenHash = await hashToken(refreshToken)

    if (previousToken === undefined) {
      await this.userSessions.open(
        userId,
        tokenHash,
        expiresAt,
        tierPlan(session.tenant.tier).multipleSessions
      )
    } else {
      const previousHash = await hashToken(previousToken)
      const rotated = await this.userSessions.rotate(
        userId,
        previousHash,
        tokenHash,
        expiresAt,
        now
      )

      if (!rotated) {
        if (!(await this.userSessions.claimLegacy(userId, previousHash))) {
          throw new UnauthorizedError('Session expired or invalid.')
        }

        await this.userSessions.open(userId, tokenHash, expiresAt, true)
      }
    }

    return {
      accessToken,
      refreshToken,
      accessMaxAgeS: this.ttls.accessTtlS,
      refreshMaxAgeS,
    }
  }

  async sessionFor(user: User): Promise<SessionResponse> {
    const [[tenant], settings] = await Promise.all([
      this.db.query.tenants.findMany({
        where: { id: user.tenantId },
        limit: 1,
      }),
      this.settings.findByTenant(user.tenantId),
    ])

    return this.sessionResponse(user, tenant, settings)
  }

  private sessionResponse(
    user: PublicUser | Session['user'],
    tenant: Tenant | undefined,
    settings: TenantSettingsRow | undefined
  ): SessionResponse {
    if (tenant === undefined || settings === undefined) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    const {
      password: _password,
      refreshTokenHash: _hash,
      ...publicUser
    } = user as User

    return {
      user: {
        id: publicUser.id,
        tenantId: publicUser.tenantId,
        email: publicUser.email,
        name: publicUser.name,
        role: publicUser.role,
        startPage: toStartPage(publicUser.startPage),
        createdAt: publicUser.createdAt.toISOString(),
        updatedAt: publicUser.updatedAt.toISOString(),
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        tier: tierPlan(tenant.tier).level,
        expiresIn: tenant.expiresIn?.toISOString() ?? null,
        deletionDate: tenant.deletionDate,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
      settings: {
        timezone: settings.timezone,
        mainCurrency: settings.mainCurrency,
        timezoneConfirmed: settings.timezoneConfirmed,
        unsplitMode: settings.unsplitMode,
      },
    }
  }

  private conflictFor(error: unknown): Error {
    if (isUniqueViolation(error, 'users', ['email'])) {
      return new ConflictError('This email already has an account.')
    }
    if (isUniqueViolation(error, 'tenants', ['name'])) {
      return new ConflictError('This tenant name is already taken.')
    }

    return error instanceof Error ? error : new Error(String(error))
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

import { isUniqueViolation } from '../common/db-errors.js'
import { runBatch } from '../common/ledger/ledger-batch.js'
