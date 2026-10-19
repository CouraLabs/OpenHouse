import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import bcrypt from 'bcrypt'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type {
  Currency,
  Database,
  Tenant,
  TenantSettingsRow,
  User,
  UserRole,
} from '@workspace/db'
import { tenants, tenantCodes, users } from '@workspace/db'
import { toStartPage, type SessionResponse } from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { JWT_TTLS, type JwtTtls } from './jwt-ttls.js'
import { hashToken, TokenService } from './token.service.js'

/**
 * A hash no password matches, compared against when the email is unknown so
 * a sign-in costs one bcrypt round either way — the response time does not
 * reveal which emails have an account.
 */
const NO_USER_HASH = bcrypt.hashSync('no-user-has-this-password', 10)

/**
 * The piece of a user the API shares with the web app: never the password
 * hash, never the refresh token hash.
 */
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

/** What the tenant the session acts on looks like to the web app. */
export interface PublicTenant {
  id: number
  name: string
  expiresIn: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Establishes and maintains sessions: creating tenants with their owner,
 * joining through a code, checking credentials, rotating refresh tokens.
 *
 * Every tenant context comes from the database row of the user the session
 * belongs to — no route ever accepts a tenant id from a client.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(SettingsRepository) private readonly settings: SettingsRepository,
    @Inject(JWT_TTLS) private readonly ttls: JwtTtls
  ) {}

  /**
   * Creates the tenant with its first user, who owns it, and its settings.
   * All three rows exist or none does: a sign-up that fails halfway leaves
   * no orphan tenant. The browser sends its time zone and currency; a
   * client that sends no zone gets `UTC`, left unconfirmed.
   */
  async signUpWithTenant(body: {
    tenantName: string
    name: string
    email: string
    password: string
    timezone?: string
    currency?: Currency
  }): Promise<SessionResponse> {
    const passwordHash = await bcrypt.hash(body.password, 10)

    const created = await this.db.transaction(async (tx) => {
      try {
        const [tenant] = await tx
          .insert(tenants)
          .values({ name: body.tenantName })
          .returning()

        const [user] = await tx
          .insert(users)
          .values({
            tenantId: tenant.id,
            email: normalizeEmail(body.email),
            name: body.name,
            password: passwordHash,
            role: 'owner',
          })
          .returning()

        const settings = await this.settings.insert(
          tenant.id,
          {
            timezone: body.timezone ?? 'UTC',
            mainCurrency: body.currency ?? 'USD',
            timezoneConfirmed: body.timezone !== undefined,
          },
          tx
        )

        return { tenant, user, settings }
      } catch (error) {
        throw this.conflictFor(error)
      }
    })

    return this.sessionResponse(created.user, created.tenant, created.settings)
  }

  /**
   * Creates a user in the tenant a valid invite code names. The code is
   * marked used in the same transaction that inserts the user, so it can
   * never be redeemed twice.
   */
  async signUpWithCode(body: {
    tenantCode: string
    name: string
    email: string
    password: string
  }): Promise<SessionResponse> {
    const passwordHash = await bcrypt.hash(body.password, 10)

    const now = new Date()
    const [code] = await this.db.query.tenantCodes.findMany({
      where: { code: body.tenantCode },
      limit: 1,
    })
    if (code === undefined) {
      throw new UnauthorizedException('Unknown tenant code.')
    }
    if (code.usedAt !== null) {
      throw new ConflictException('This tenant code was already used.')
    }
    if (code.expiresAt !== null && code.expiresAt < now) {
      throw new ConflictException('This tenant code has expired.')
    }

    const created = await this.db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(tenantCodes)
        .set({ usedAt: now })
        .where(and(eq(tenantCodes.id, code.id), isNull(tenantCodes.usedAt)))
        .returning()
      if (claimed === undefined) {
        // Another request redeemed it between the check above and here.
        throw new ConflictException('This tenant code was already used.')
      }

      try {
        const [user] = await tx
          .insert(users)
          .values({
            tenantId: code.tenantId,
            email: normalizeEmail(body.email),
            name: body.name,
            password: passwordHash,
            role: 'user',
          })
          .returning()

        return user
      } catch (error) {
        throw this.conflictFor(error)
      }
    })

    return this.sessionFor(created)
  }

  /**
   * Checks the credentials and starts a session. The message is the same
   * whether the email is unknown or the password is wrong, so the endpoint
   * cannot be used to discover which emails have signed up.
   *
   * An email is unique across every tenant (`users_email_key` on
   * `lower(email)`), so the lookup finds at most one row — the tenant the
   * session acts on is that user's, never whichever row came first.
   */
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
      user?.password ?? NO_USER_HASH
    )
    if (!passwordMatches || user === undefined || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.')
    }

    return this.sessionFor(user)
  }

  /**
   * Extends the session: verifies the presented refresh token, checks it
   * against the hash on the user row, and issues the next pair.
   *
   * A token that verifies but does not match the stored hash was rotated out
   * — reuse of a stolen one — and revokes the session outright.
   */
  async refresh(
    userId: number,
    presentedToken: string
  ): Promise<SessionResponse> {
    const [user] = await this.db.query.users.findMany({
      where: { id: userId },
      limit: 1,
    })
    if (
      user === undefined ||
      !user.isActive ||
      user.refreshTokenHash === null ||
      user.refreshTokenHash !== hashToken(presentedToken)
    ) {
      // The presented token is not the one this session was issued with.
      // Revoke everything this user could still have in flight.
      await this.db
        .update(users)
        .set({ refreshTokenHash: null })
        .where(eq(users.id, userId))

      throw new UnauthorizedException('Session expired or invalid.')
    }

    return this.sessionFor(user)
  }

  /** The session response of a request the guard already resolved. */
  async current(session: Session): Promise<SessionResponse> {
    const settings = await this.settings.findByTenant(session.tenant.id)

    return this.sessionResponse(session.user, session.tenant, settings)
  }

  /**
   * Changes the signed-in user's password. The current password must
   * match; the stored refresh hash is cleared, which signs out every other
   * session — the caller then issues a fresh pair for this one.
   */
  async changePassword(
    userId: number,
    body: { currentPassword: string; newPassword: string }
  ): Promise<SessionResponse> {
    const [user] = await this.db.query.users.findMany({
      where: { id: userId },
      limit: 1,
    })
    if (user === undefined || !user.isActive) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect.')
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

    return this.sessionFor(updated)
  }

  /** Ends the session server-side: the next refresh token stops working. */
  async signOut(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash: null })
      .where(eq(users.id, userId))
  }

  /**
   * Issues the token pair of a session and stores the refresh token's hash on
   * the user row. Everything a sign-in, sign-up, or refresh ends with goes
   * through here.
   */
  async establishSession(
    user: PublicUser | { id: number; role: UserRole },
    rememberMe: boolean
  ): Promise<{
    accessToken: string
    refreshToken: string
    accessMaxAgeS: number
    refreshMaxAgeS: number
  }> {
    const accessToken = this.tokens.signAccessToken(user.id)
    const { token: refreshToken } = this.tokens.signRefreshToken(
      user.id,
      rememberMe
    )
    await this.db
      .update(users)
      .set({ refreshTokenHash: hashToken(refreshToken), updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return {
      accessToken,
      refreshToken,
      accessMaxAgeS: this.ttls.accessTtlS,
      refreshMaxAgeS: rememberMe
        ? this.ttls.rememberRefreshTtlS
        : this.ttls.refreshTtlS,
    }
  }

  /** Reads the tenant and settings of a user and shapes their session — a
   * user a password reset just signed back in, for one. */
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

  /** Shapes a user, their tenant, and its settings for the response,
   * dropping secrets. */
  private sessionResponse(
    user: PublicUser | Omit<User, 'password' | 'refreshTokenHash'>,
    tenant: Tenant | undefined,
    settings: TenantSettingsRow | undefined
  ): SessionResponse {
    if (tenant === undefined || settings === undefined) {
      throw new UnauthorizedException('Session expired or invalid.')
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
        expiresIn: tenant.expiresIn?.toISOString() ?? null,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
      settings: {
        timezone: settings.timezone,
        mainCurrency: settings.mainCurrency,
        timezoneConfirmed: settings.timezoneConfirmed,
      },
    }
  }

  /**
   * Maps the unique-constraint violations of a sign-up to the response the
   * web app can act on. Saying an email is taken reveals it is registered —
   * the accepted trade-off for a household app; the sign-up throttle limits
   * enumeration.
   */
  private conflictFor(error: unknown): Error {
    const constraint = violatedConstraint(error)
    if (constraint === 'users_email_key') {
      return new ConflictException('This email already has an account.')
    }
    if (constraint === 'tenants_name_key') {
      return new ConflictException('This tenant name is already taken.')
    }

    return error instanceof Error ? error : new Error(String(error))
  }
}

/** The one spelling an email is stored and looked up in. The poco schemas
 * already normalize a body; this keeps every write and read agreeing even
 * for a caller that skipped them. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Names the constraint a unique violation (`23505`) broke, or nothing. The
 * driver error rides as the `cause` of drizzle's `DrizzleQueryError`, whose
 * own message is only the failed SQL — so the constraint is read off the
 * error or its cause, never off a message.
 */
function violatedConstraint(error: unknown): string | undefined {
  for (const candidate of [error, (error as { cause?: unknown })?.cause]) {
    const pgError = candidate as { code?: string; constraint?: string } | null
    if (pgError?.code === '23505') {
      return pgError.constraint
    }
  }

  return undefined
}
