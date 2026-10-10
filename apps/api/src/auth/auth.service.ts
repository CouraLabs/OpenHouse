import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import bcrypt from 'bcrypt'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, eq, isNull } from 'drizzle-orm'
import type { Database, Tenant, User, UserRole } from '@workspace/db'
import { tenants, tenantCodes, users } from '@workspace/db'
import type { SessionResponse } from '@workspace/poco'
import { getJwtTtls } from '../config/env.js'
import { hashToken, TokenService } from './token.service.js'

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
    @Inject(TokenService) private readonly tokens: TokenService
  ) {}

  /**
   * Creates the tenant with its first user, who owns it. Both rows exist or
   * neither does: a sign-up that fails halfway leaves no orphan tenant.
   */
  async signUpWithTenant(body: {
    tenantName: string
    name: string
    email: string
    password: string
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
            email: body.email,
            name: body.name,
            password: passwordHash,
            role: 'owner',
          })
          .returning()

        return { tenant, user }
      } catch (error) {
        throw this.conflictFor(error, body.email)
      }
    })

    return this.sessionResponse(created.user, created.tenant)
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
            email: body.email,
            name: body.name,
            password: passwordHash,
            role: 'user',
          })
          .returning()

        return user
      } catch (error) {
        throw this.conflictFor(error, body.email)
      }
    })

    const [tenant] = await this.db.query.tenants.findMany({
      where: { id: created.tenantId },
      limit: 1,
    })

    return this.sessionResponse(created, tenant)
  }

  /**
   * Checks the credentials and starts a session. The message is the same
   * whether the email is unknown or the password is wrong, so the endpoint
   * cannot be used to discover which emails have signed up.
   */
  async signIn(body: { email: string; password: string }): Promise<SessionResponse> {
    const [user] = await this.db.query.users.findMany({
      where: { email: body.email },
      limit: 1,
    })

    const passwordMatches =
      user !== undefined && (await bcrypt.compare(body.password, user.password))
    if (!passwordMatches || user === undefined || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.')
    }

    const [tenant] = await this.db.query.tenants.findMany({
      where: { id: user.tenantId },
      limit: 1,
    })

    return this.sessionResponse(user, tenant)
  }

  /**
   * Extends the session: verifies the presented refresh token, checks it
   * against the hash on the user row, and issues the next pair.
   *
   * A token that verifies but does not match the stored hash was rotated out
   * — reuse of a stolen one — and revokes the session outright.
   */
  async refresh(userId: number, presentedToken: string): Promise<SessionResponse> {
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
      await this.db.update(users).set({ refreshTokenHash: null }).where(eq(users.id, userId))

      throw new UnauthorizedException('Session expired or invalid.')
    }

    const [tenant] = await this.db.query.tenants.findMany({
      where: { id: user.tenantId },
      limit: 1,
    })

    return this.sessionResponse(user, tenant)
  }

  /** Ends the session server-side: the next refresh token stops working. */
  async signOut(userId: number): Promise<void> {
    await this.db.update(users).set({ refreshTokenHash: null }).where(eq(users.id, userId))
  }

  /**
   * Issues the token pair of a session and stores the refresh token's hash on
   * the user row. Everything a sign-in, sign-up, or refresh ends with goes
   * through here.
   */
  async establishSession(
    user: PublicUser | { id: number; role: UserRole },
    rememberMe: boolean
  ): Promise<{ accessToken: string; refreshToken: string; accessMaxAgeS: number; refreshMaxAgeS: number }> {
    const accessToken = this.tokens.signAccessToken(user.id)
    const { token: refreshToken } = this.tokens.signRefreshToken(user.id)
    await this.db
      .update(users)
      .set({ refreshTokenHash: hashToken(refreshToken), updatedAt: new Date() })
      .where(eq(users.id, user.id))

    const ttls = getJwtTtls()

    return {
      accessToken,
      refreshToken,
      accessMaxAgeS: ttls.accessTtlS,
      refreshMaxAgeS: rememberMe ? ttls.rememberRefreshTtlS : ttls.refreshTtlS,
    }
  }

  /** Shapes a user and their tenant for the response, dropping secrets. */
  private sessionResponse(user: PublicUser | Omit<User, 'password' | 'refreshTokenHash'>, tenant: Tenant | undefined): SessionResponse {
    if (tenant === undefined) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    const { password: _password, refreshTokenHash: _hash, ...publicUser } = user as User

    return {
      user: {
        id: publicUser.id,
        tenantId: publicUser.tenantId,
        email: publicUser.email,
        name: publicUser.name,
        role: publicUser.role,
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
    }
  }

  /**
   * Maps the unique-constraint violations of a sign-up to the response the
   * web app can act on.
   */
  private conflictFor(error: unknown, email: string): Error {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('users_tenant_id_email_key')) {
      return new ConflictException(`The email ${email} is already in this tenant.`)
    }
    if (message.includes('tenants_name_key')) {
      return new ConflictException('This tenant name is already taken.')
    }

    return error instanceof Error ? error : new Error(String(error))
  }
}
